-- =============================================================
-- SEEN POINT: Triggers & Stored Functions
-- =============================================================
-- Triggers allow the database to automatically respond to
-- data changes — no application-level code needed.
-- =============================================================

-- =============================================================
-- TRIGGER 1: Auto-update content search vector
-- When a movie's title/synopsis changes, rebuild the search vector
-- =============================================================

CREATE OR REPLACE FUNCTION fn_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Build weighted search vector:
    -- 'A' weight = title (most important)
    -- 'B' weight = tagline
    -- 'C' weight = synopsis
    -- 'D' weight = tags joined as string
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.tagline, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.synopsis, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
    
    -- Also update the updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_content_search_vector
    BEFORE INSERT OR UPDATE OF title, tagline, synopsis, tags
    ON content
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_search_vector();

-- =============================================================
-- TRIGGER 2: Auto-update content avg_rating and total_ratings
-- Fires when a user adds/updates/deletes a rating
-- =============================================================

CREATE OR REPLACE FUNCTION fn_update_content_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_content_id UUID;
BEGIN
    -- Determine which content_id was affected
    IF (TG_OP = 'DELETE') THEN
        v_content_id := OLD.content_id;
    ELSE
        v_content_id := NEW.content_id;
    END IF;
    
    -- Recalculate and update content stats atomically
    UPDATE content
    SET
        avg_rating = (
            SELECT ROUND(AVG(score)::NUMERIC, 2)
            FROM ratings
            WHERE content_id = v_content_id
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM ratings
            WHERE content_id = v_content_id
        )
    WHERE id = v_content_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_content_rating
    AFTER INSERT OR UPDATE OR DELETE
    ON ratings
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_content_rating();

-- =============================================================
-- TRIGGER 3: Auto-increment view count when watch history added
-- =============================================================

CREATE OR REPLACE FUNCTION fn_increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Only count as a new view if starting fresh (progress = 0)
    -- Prevents counting every progress update as a view
    IF NEW.progress_seconds < 30 THEN
        UPDATE content
        SET total_views = total_views + 1
        WHERE id = NEW.content_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_increment_view_count
    AFTER INSERT
    ON watch_history
    FOR EACH ROW
    EXECUTE FUNCTION fn_increment_view_count();

-- =============================================================
-- TRIGGER 4: Auto-generate slug for content
-- =============================================================

CREATE OR REPLACE FUNCTION fn_generate_content_slug()
RETURNS TRIGGER AS $$
DECLARE
    v_base_slug TEXT;
    v_slug TEXT;
    v_count INTEGER := 0;
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Convert title to URL-friendly slug
        v_base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    UNACCENT(NEW.title),
                    '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars
                ),
                '\s+', '-', 'g'                  -- Replace spaces with hyphens
            )
        );
        
        v_slug := v_base_slug || '-' || NEW.release_year::TEXT;
        
        -- Handle slug collisions by appending a counter
        WHILE EXISTS (SELECT 1 FROM content WHERE slug = v_slug AND id != NEW.id) LOOP
            v_count := v_count + 1;
            v_slug := v_base_slug || '-' || NEW.release_year::TEXT || '-' || v_count::TEXT;
        END LOOP;
        
        NEW.slug := v_slug;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_generate_content_slug
    BEFORE INSERT OR UPDATE OF title
    ON content
    FOR EACH ROW
    EXECUTE FUNCTION fn_generate_content_slug();

-- =============================================================
-- TRIGGER 5: Create notification when new content is published
-- =============================================================

CREATE OR REPLACE FUNCTION fn_notify_new_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Only fire when content transitions from unpublished → published
    IF (OLD.is_published = FALSE AND NEW.is_published = TRUE) THEN
        INSERT INTO notifications (user_id, type, title, body, link)
        SELECT
            u.id,
            'new_content',
            'New ' || INITCAP(NEW.content_type) || ' Available!',
            '"' || NEW.title || '" is now available to stream.',
            '/pages/detail.html?id=' || NEW.id::TEXT
        FROM users u
        WHERE u.is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_notify_new_content
    AFTER UPDATE OF is_published
    ON content
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_new_content();

-- =============================================================
-- TRIGGER 6: Auto-update user subscription status
-- =============================================================

CREATE OR REPLACE FUNCTION fn_check_subscription_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If subscription has expired, mark user accordingly
    IF NEW.subscription_end IS NOT NULL AND NEW.subscription_end < NOW() THEN
        NEW.subscription_plan_id := NULL;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_check_subscription
    BEFORE UPDATE
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_subscription_status();
