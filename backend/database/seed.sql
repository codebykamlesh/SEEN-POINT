-- =============================================================
-- SEEN POINT: Seed Data
-- =============================================================
-- Rich sample data for development and demonstration
-- =============================================================

-- Subscription Plans
INSERT INTO subscription_plans (id, name, price, max_screens, max_quality, description) VALUES
    ('4e38a0f5-46c7-4380-9109-6766eab31971', 'Basic',    6.99,  1, 'SD',  'Stream on 1 screen in SD quality'),
    ('875d6662-123b-4ba6-a641-25dd2d1d7357', 'Standard', 12.99, 2, 'HD',  'Stream on 2 screens in HD quality'),
    ('b358fc38-058d-4a32-802f-ef507607691a', 'Premium',  19.99, 4, '4K',  'Stream on 4 screens in 4K Ultra HD + HDR')
ON CONFLICT DO NOTHING;

-- Admin User (password: Admin@123)
INSERT INTO users (id, email, password_hash, full_name, subscription_plan_id, subscription_start, subscription_end, is_admin, email_verified) VALUES
    ('4ae5020e-1c4e-4dfc-9441-7ebf38683205',
     'admin@seenpoint.com',
     '$2a$12$ou4.F1yvsQstB8xmQZc56.qoEMJi4DVYT/8v7xO8wC0W6k9njNX06',
     'Admin User',
     NULL,
     NULL,
     NULL,
     TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Sample Users (password: User@1234 for all)
INSERT INTO users (id, email, password_hash, full_name, subscription_plan_id, subscription_start, subscription_end, email_verified) VALUES
    ('b9efeb90-427f-4d33-b584-1b92a48e1504', 'alice@example.com',  '$2a$12$9gfRyiCdv7zlpFXLMhdN5.LkDc.g9vUijw7W11ncIDsAOrxs7lFtm', 'Alice Johnson', NULL, NULL, NULL, TRUE),
    ('3a97a235-9662-4b0c-89ef-9a49668a3c3a', 'bob@example.com',     '$2a$12$9gfRyiCdv7zlpFXLMhdN5.LkDc.g9vUijw7W11ncIDsAOrxs7lFtm', 'Bob Smith',    NULL, NULL, NULL, TRUE),
    ('772bde68-d074-4ac5-81e2-a9ff4ff4d9da', 'carol@example.com',  '$2a$12$9gfRyiCdv7zlpFXLMhdN5.LkDc.g9vUijw7W11ncIDsAOrxs7lFtm', 'Carol White',  NULL, NULL, NULL, TRUE)
ON CONFLICT DO NOTHING;

-- Profiles
INSERT INTO profiles (id, user_id, name, avatar_url, is_kids) VALUES
    ('51a84fbb-35c7-4e6e-9fa7-3a30507b4980', '4ae5020e-1c4e-4dfc-9441-7ebf38683205', 'Admin',   'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',  FALSE),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'b9efeb90-427f-4d33-b584-1b92a48e1504', 'Alice',   'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',  FALSE),
    ('1e4dbd22-b1f4-4394-b06e-fb9ef7eb7c28', 'b9efeb90-427f-4d33-b584-1b92a48e1504', 'Kids',    'https://api.dicebear.com/7.x/avataaars/svg?seed=kids',   TRUE),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', '3a97a235-9662-4b0c-89ef-9a49668a3c3a', 'Bob',     'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',    FALSE),
    ('cabf83ee-0da6-427c-ba04-9b57d2eab625', '772bde68-d074-4ac5-81e2-a9ff4ff4d9da', 'Carol',   'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',  FALSE)
ON CONFLICT DO NOTHING;

-- Genres
INSERT INTO genres (id, name, slug) VALUES
    ('2beb0662-fb76-4c6e-befb-49ae7cd91d0c', 'Action',       'action'),
    ('7886f237-cd40-498e-9572-86ec745ad526', 'Drama',        'drama'),
    ('110233d8-cc22-4692-8547-a016c4567f77', 'Comedy',       'comedy'),
    ('c5f810c0-30b9-4fe4-9d2a-02c702b05178', 'Sci-Fi',       'sci-fi'),
    ('68b5b638-8c67-4901-80fa-9de44ca18ead', 'Horror',       'horror'),
    ('f67738f3-9270-4662-9974-16b70b82adb2', 'Thriller',     'thriller'),
    ('b30094fc-058d-4af2-97b5-4e18b6da6bde', 'Romance',      'romance'),
    ('8e6b1537-7002-4e8a-bc61-fe8d83c17baa', 'Animation',    'animation'),
    ('14f26dde-8293-48ee-92e1-5af520e3be69', 'Documentary',  'documentary'),
    ('fb8218cd-2a1d-4b1f-85de-20136433d9d1', 'Crime',        'crime'),
    ('cd67e65e-f369-476c-abb5-bb84f56f60ca', 'Fantasy',      'fantasy'),
    ('a0b9817d-bd28-40da-9066-8c57edbf92e4', 'Adventure',    'adventure')
ON CONFLICT DO NOTHING;

-- People (Cast & Crew)
INSERT INTO people (id, name, bio, birth_date, photo_url) VALUES
    ('f629db80-7e14-4b35-8cc5-dd95167e6ec3', 'Christopher Nolan',  'British-American filmmaker known for complex narratives and visual innovation.',         '1970-07-30', 'https://randomuser.me/api/portraits/men/1.jpg'),
    ('9126edc1-1664-406a-9c03-570bfb78c369', 'Leonardo DiCaprio',  'One of Hollywood''s top actors, known for intense and dedicated performances.',          '1974-11-11', 'https://randomuser.me/api/portraits/men/2.jpg'),
    ('28328b03-009e-4f38-8cb1-811ea6e7fcda', 'Meryl Streep',       'Widely regarded as one of the greatest actresses of all time.',                          '1949-06-22', 'https://randomuser.me/api/portraits/women/1.jpg'),
    ('a7a15287-b0fb-4bb4-8dfe-b37239db2dca', 'Ryan Gosling',       'Canadian actor known for his versatility and charismatic screen presence.',               '1980-11-12', 'https://randomuser.me/api/portraits/men/3.jpg'),
    ('113c3012-05e1-45ea-a682-32dea7b57097', 'Emma Stone',         'Academy Award-winning actress with a remarkable range of roles.',                         '1988-11-06', 'https://randomuser.me/api/portraits/women/2.jpg'),
    ('f6afd5cd-0a15-4970-9e7a-b74e32ba83a0', 'Denis Villeneuve',   'Canadian director acclaimed for visually stunning and thought-provoking films.',          '1967-10-03', 'https://randomuser.me/api/portraits/men/4.jpg'),
    ('70f0afb3-0c04-4765-ae6d-73f040d15e81', 'Zendaya',            'Award-winning actress and singer known for her compelling dramatic performances.',         '1996-09-01', 'https://randomuser.me/api/portraits/women/3.jpg'),
    ('dd468814-5951-4363-9db0-987467c7135a', 'Tom Hanks',          'One of the most beloved actors in Hollywood history.',                                     '1956-07-09', 'https://randomuser.me/api/portraits/men/5.jpg'),
    ('a6f0ec89-e76c-47eb-ab33-e166c41900d6', 'Margot Robbie',      'Australian actress who has delivered some of the most memorable performances of her era.', '1990-07-02', 'https://randomuser.me/api/portraits/women/4.jpg'),
    ('25cf747d-05a1-4845-b153-ddd66b8448e1', 'Ridley Scott',       'British director with a distinguished career spanning action, sci-fi, and historical epics.', '1937-11-30', 'https://randomuser.me/api/portraits/men/6.jpg')
ON CONFLICT DO NOTHING;

-- Content (Movies)
INSERT INTO content (id, title, content_type, synopsis, tagline, release_year, duration_min, maturity_rating, poster_url, backdrop_url, trailer_url, video_url, language, country, imdb_id, is_published, is_featured, avg_rating, total_views, tags, source_type, full_video_url, is_free) VALUES

('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 'Inception', 'movie',
 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
 'Your mind is the scene of the crime.',
 2010, 148, 'PG-13',
 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
 'https://www.youtube.com/watch?v=YoHD9XEInc0',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt1375666', TRUE, TRUE, 8.8, 125000,
 ARRAY['dream', 'heist', 'psychological', 'mind-bending', 'sci-fi'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('f5380047-7d0b-4089-b9cf-a1bdac574677', 'Interstellar', 'movie',
 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.',
 'Mankind was born on Earth. It was never meant to die here.',
 2014, 169, 'PG-13',
 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
 'https://image.tmdb.org/t/p/original/pbrkL804c8yAv3zBZR4QPEafpAR.jpg',
 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt0816692', TRUE, TRUE, 8.6, 110000,
 ARRAY['space', 'wormhole', 'relativity', 'survival', 'science'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('12402963-381b-43bb-b3d6-a2ddc78b3911', 'La La Land', 'movie',
 'A jazz musician and an aspiring actress fall in love while pursuing their dreams in Los Angeles.',
 'Here''s to the ones who dream.',
 2016, 128, 'PG-13',
 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
 'https://image.tmdb.org/t/p/original/nadTlnTE6DdFCdSMxNBGJqHhLl8.jpg',
 'https://www.youtube.com/watch?v=0pdqf4P9MB8',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt3783958', TRUE, FALSE, 8.0, 85000,
 ARRAY['musical', 'romance', 'dreams', 'jazz', 'los angeles'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('bb142616-28fd-4c99-8b22-354fa174ff3c', 'Dune', 'movie',
 'Feature adaptation of Frank Herbert''s science fiction novel about the son of a noble family entrusted with the protection of the most valuable asset in the galaxy.',
 'Beyond fear, destiny awaits.',
 2021, 155, 'PG-13',
 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
 'https://image.tmdb.org/t/p/original/eeIStTMhkBmkltpEbcGAiDFmpuD.jpg',
 'https://www.youtube.com/watch?v=8g18jFHCLXk',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt1160419', TRUE, TRUE, 8.1, 95000,
 ARRAY['desert', 'spice', 'prophecy', 'epic', 'politics'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', 'The Dark Knight', 'movie',
 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
 'Why so serious?',
 2008, 152, 'PG-13',
 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
 'https://image.tmdb.org/t/p/original/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
 'https://www.youtube.com/watch?v=EXeTwQWrcwY',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt0468569', TRUE, FALSE, 9.0, 180000,
 ARRAY['batman', 'joker', 'superhero', 'crime', 'chaos'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('239c29a9-3857-4bb7-88e6-95373035ff3b', 'Get Out', 'movie',
 'A young African-American visits his white girlfriend''s parents for the weekend, where his simmering unease about their reception of him eventually reaches a boiling point.',
 'Just because you''re invited doesn''t mean you''re welcome.',
 2017, 104, 'R',
 'https://image.tmdb.org/t/p/w500/qLP7mFRSBfcLfLzQEJMbTIpVtNb.jpg',
 'https://image.tmdb.org/t/p/original/v8AKE1K1HmzFEaGE4ZECREb2g5k.jpg',
 'https://www.youtube.com/watch?v=sRfnevzM9kQ',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt5052448', TRUE, FALSE, 7.7, 60000,
 ARRAY['social horror', 'race', 'hypnosis', 'psychological'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('666bf239-d156-44b1-9e35-f7b40f23eb7b', 'Forrest Gump', 'movie',
 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
 'Life is like a box of chocolates.',
 1994, 142, 'PG-13',
 'https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg',
 'https://image.tmdb.org/t/p/original/ic0intvXZSfBlYPIvWXpU1ivUCO.jpg',
 'https://www.youtube.com/watch?v=bLvqoHBptjg',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt0109830', TRUE, FALSE, 8.8, 142000,
 ARRAY['life story', 'history', 'running', 'destiny', 'america'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('af50cacc-6d37-46db-ad6c-6acbc5552590', 'Mad Max: Fury Road', 'movie',
 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners, a psychotic worshipper, and a drifter named Max.',
 'What a lovely day!',
 2015, 120, 'R',
 'https://image.tmdb.org/t/p/w500/kqjL17yufvn9OVLyXYpvtyrFfak.jpg',
 'https://image.tmdb.org/t/p/original/tbhdm8UJASTBJGqFMwlGAdwu2Kc.jpg',
 'https://www.youtube.com/watch?v=hEJnMQG9ev8',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'Australia', 'tt1392190', TRUE, FALSE, 8.1, 78000,
 ARRAY['post-apocalyptic', 'cars', 'desert', 'rebellion', 'action'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('5cf1cd21-d83f-4713-bdfe-eae7b946e453', 'Parasite', 'movie',
 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
 'Act like you own the place.',
 2019, 132, 'R',
 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'ko', 'South Korea', 'tt6751668', TRUE, FALSE, 8.5, 92000,
 ARRAY['class', 'inequality', 'korean', 'dark comedy', 'social'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('3adcb301-316b-408c-b1ee-072bcd48c574', 'Blade Runner 2049', 'movie',
 'Young Blade Runner K''s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who''s been missing for thirty years.',
 'The key to the future is finally unearthed.',
 2017, 164, 'R',
 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg',
 'https://image.tmdb.org/t/p/original/ilRyazdMJwN05exqhwK4tMKBYZs.jpg',
 'https://www.youtube.com/watch?v=gCcx85zbxz4',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt1856101', TRUE, FALSE, 8.0, 68000,
 ARRAY['dystopian', 'replicant', 'future', 'detective', 'visual'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE)

ON CONFLICT (id) DO UPDATE
SET full_video_url = EXCLUDED.full_video_url,
    trailer_url = EXCLUDED.trailer_url;

-- TV Series
INSERT INTO content (id, title, content_type, synopsis, tagline, release_year, maturity_rating, poster_url, backdrop_url, trailer_url, video_url, language, country, imdb_id, is_published, is_featured, avg_rating, total_views, tags, source_type, full_video_url, is_free) VALUES

('594af880-5e2b-4694-b31c-1a21a1e26554', 'Breaking Bad', 'series',
 'A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine to secure his family''s future.',
 'All hail the King.',
 2008, 'TV-MA',
 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
 'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
 'https://www.youtube.com/watch?v=HhesaQXLuRY',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt0903747', TRUE, TRUE, 9.5, 310000,
 ARRAY['drugs', 'chemistry', 'crime', 'transformation', 'meth'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('ae6fe925-8451-44c0-8db4-d10684453c15', 'Stranger Things', 'series',
 'When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces.',
 'Every ending has a beginning.',
 2016, 'TV-14',
 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGSST.jpg',
 'https://image.tmdb.org/t/p/original/rcA17r3BYHNygpWmkQKz1pVxCUn.jpg',
 'https://www.youtube.com/watch?v=b9EkMc79ZSU',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'USA', 'tt4574334', TRUE, TRUE, 8.7, 285000,
 ARRAY['supernatural', '80s', 'kids', 'upside down', 'demogorgon'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE),

('475fd54c-5438-4a91-99f9-e958ad64a560', 'The Crown', 'series',
 'Follows the political rivalries and romance of Queen Elizabeth II''s reign and the events that shaped the second half of the 20th century.',
 'Power changes everything.',
 2016, 'TV-MA',
 'https://image.tmdb.org/t/p/w500/1M876KPjulVwppEpldhdc8V4o68.jpg',
 'https://image.tmdb.org/t/p/original/g0FjSEmSmHNqisMsdBa7BXI3zsN.jpg',
 'https://www.youtube.com/watch?v=JWtnJjn6ng0',
 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
 'en', 'UK', 'tt4786824', TRUE, FALSE, 8.6, 142000,
 ARRAY['royalty', 'queen', 'politics', 'british history', 'drama'],
 'public_domain', 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', TRUE)

ON CONFLICT (id) DO UPDATE
SET full_video_url = EXCLUDED.full_video_url,
    trailer_url = EXCLUDED.trailer_url;

-- Content Genres (assign genres to content)
INSERT INTO content_genres (content_id, genre_id) VALUES
    ('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', '2beb0662-fb76-4c6e-befb-49ae7cd91d0c'), -- Inception: Action
    ('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Inception: Sci-Fi
    ('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 'f67738f3-9270-4662-9974-16b70b82adb2'), -- Inception: Thriller
    ('f5380047-7d0b-4089-b9cf-a1bdac574677', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Interstellar: Sci-Fi
    ('f5380047-7d0b-4089-b9cf-a1bdac574677', '7886f237-cd40-498e-9572-86ec745ad526'), -- Interstellar: Drama
    ('f5380047-7d0b-4089-b9cf-a1bdac574677', 'a0b9817d-bd28-40da-9066-8c57edbf92e4'), -- Interstellar: Adventure
    ('12402963-381b-43bb-b3d6-a2ddc78b3911', 'b30094fc-058d-4af2-97b5-4e18b6da6bde'), -- La La Land: Romance
    ('12402963-381b-43bb-b3d6-a2ddc78b3911', '7886f237-cd40-498e-9572-86ec745ad526'), -- La La Land: Drama
    ('bb142616-28fd-4c99-8b22-354fa174ff3c', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Dune: Sci-Fi
    ('bb142616-28fd-4c99-8b22-354fa174ff3c', '2beb0662-fb76-4c6e-befb-49ae7cd91d0c'), -- Dune: Action
    ('bb142616-28fd-4c99-8b22-354fa174ff3c', 'a0b9817d-bd28-40da-9066-8c57edbf92e4'), -- Dune: Adventure
    ('a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', '2beb0662-fb76-4c6e-befb-49ae7cd91d0c'), -- Dark Knight: Action
    ('a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', 'fb8218cd-2a1d-4b1f-85de-20136433d9d1'), -- Dark Knight: Crime
    ('a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', 'f67738f3-9270-4662-9974-16b70b82adb2'), -- Dark Knight: Thriller
    ('239c29a9-3857-4bb7-88e6-95373035ff3b', '68b5b638-8c67-4901-80fa-9de44ca18ead'), -- Get Out: Horror
    ('239c29a9-3857-4bb7-88e6-95373035ff3b', 'f67738f3-9270-4662-9974-16b70b82adb2'), -- Get Out: Thriller
    ('666bf239-d156-44b1-9e35-f7b40f23eb7b', '7886f237-cd40-498e-9572-86ec745ad526'), -- Forrest Gump: Drama
    ('666bf239-d156-44b1-9e35-f7b40f23eb7b', 'b30094fc-058d-4af2-97b5-4e18b6da6bde'), -- Forrest Gump: Romance
    ('af50cacc-6d37-46db-ad6c-6acbc5552590', '2beb0662-fb76-4c6e-befb-49ae7cd91d0c'), -- Mad Max: Action
    ('af50cacc-6d37-46db-ad6c-6acbc5552590', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Mad Max: Sci-Fi
    ('5cf1cd21-d83f-4713-bdfe-eae7b946e453', 'f67738f3-9270-4662-9974-16b70b82adb2'), -- Parasite: Thriller
    ('5cf1cd21-d83f-4713-bdfe-eae7b946e453', '7886f237-cd40-498e-9572-86ec745ad526'), -- Parasite: Drama
    ('5cf1cd21-d83f-4713-bdfe-eae7b946e453', 'fb8218cd-2a1d-4b1f-85de-20136433d9d1'), -- Parasite: Crime
    ('3adcb301-316b-408c-b1ee-072bcd48c574', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Blade Runner: Sci-Fi
    ('3adcb301-316b-408c-b1ee-072bcd48c574', 'f67738f3-9270-4662-9974-16b70b82adb2'), -- Blade Runner: Thriller
    ('594af880-5e2b-4694-b31c-1a21a1e26554', 'fb8218cd-2a1d-4b1f-85de-20136433d9d1'), -- Breaking Bad: Crime
    ('594af880-5e2b-4694-b31c-1a21a1e26554', '7886f237-cd40-498e-9572-86ec745ad526'), -- Breaking Bad: Drama
    ('ae6fe925-8451-44c0-8db4-d10684453c15', '68b5b638-8c67-4901-80fa-9de44ca18ead'), -- Stranger Things: Horror
    ('ae6fe925-8451-44c0-8db4-d10684453c15', 'c5f810c0-30b9-4fe4-9d2a-02c702b05178'), -- Stranger Things: Sci-Fi
    ('ae6fe925-8451-44c0-8db4-d10684453c15', 'a0b9817d-bd28-40da-9066-8c57edbf92e4'), -- Stranger Things: Adventure
    ('475fd54c-5438-4a91-99f9-e958ad64a560', '7886f237-cd40-498e-9572-86ec745ad526'), -- The Crown: Drama
    ('475fd54c-5438-4a91-99f9-e958ad64a560', '14f26dde-8293-48ee-92e1-5af520e3be69')  -- The Crown: Documentary
ON CONFLICT DO NOTHING;

-- Content Cast
INSERT INTO content_cast (content_id, person_id, role, character, billing_order) VALUES
    ('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 'f629db80-7e14-4b35-8cc5-dd95167e6ec3', 'director', NULL, 1),
    ('4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', '9126edc1-1664-406a-9c03-570bfb78c369', 'actor', 'Dom Cobb', 1),
    ('f5380047-7d0b-4089-b9cf-a1bdac574677', 'f629db80-7e14-4b35-8cc5-dd95167e6ec3', 'director', NULL, 1),
    ('12402963-381b-43bb-b3d6-a2ddc78b3911', 'a7a15287-b0fb-4bb4-8dfe-b37239db2dca', 'actor', 'Sebastian', 1),
    ('12402963-381b-43bb-b3d6-a2ddc78b3911', '113c3012-05e1-45ea-a682-32dea7b57097', 'actor', 'Mia Dolan', 2),
    ('bb142616-28fd-4c99-8b22-354fa174ff3c', 'f6afd5cd-0a15-4970-9e7a-b74e32ba83a0', 'director', NULL, 1),
    ('bb142616-28fd-4c99-8b22-354fa174ff3c', '70f0afb3-0c04-4765-ae6d-73f040d15e81', 'actor', 'Chani', 2),
    ('666bf239-d156-44b1-9e35-f7b40f23eb7b', 'dd468814-5951-4363-9db0-987467c7135a', 'actor', 'Forrest Gump', 1),
    ('5cf1cd21-d83f-4713-bdfe-eae7b946e453', 'f629db80-7e14-4b35-8cc5-dd95167e6ec3', 'director', NULL, 1)
ON CONFLICT DO NOTHING;

-- Seasons (for Breaking Bad)
INSERT INTO seasons (id, content_id, season_number, title, synopsis, release_year) VALUES
    ('aee85a20-c385-4ddd-9c2c-746b563d060b', '594af880-5e2b-4694-b31c-1a21a1e26554', 1, 'Season 1', 'Walter White begins his descent into the criminal underworld.', 2008),
    ('d1ca6099-31c0-4ca8-adbc-a3c98a4a336c', '594af880-5e2b-4694-b31c-1a21a1e26554', 2, 'Season 2', 'Walt and Jesse expand their operation despite growing dangers.', 2009),
    ('2b2819f1-8286-443a-aa1b-5a7fe2d443bb', '594af880-5e2b-4694-b31c-1a21a1e26554', 3, 'Season 3', 'Walter White becomes further entangled in the drug trade.', 2010)
ON CONFLICT DO NOTHING;

-- Episodes (Season 1 of Breaking Bad)
INSERT INTO episodes (id, season_id, episode_number, title, synopsis, duration_min, is_published, air_date) VALUES
    ('d0df2a98-1778-44b6-9ed3-422ff0ad8ca1', 'aee85a20-c385-4ddd-9c2c-746b563d060b', 1, 'Pilot', 'Walter White, a chemistry teacher, is diagnosed with cancer and turns to making meth.', 58, TRUE, '2008-01-20'),
    ('72dcb962-45a2-4868-b172-e916b58e1f91', 'aee85a20-c385-4ddd-9c2c-746b563d060b', 2, 'Cat''s in the Bag', 'Walt and Jesse must deal with two situations which loom over them.', 48, TRUE, '2008-01-27'),
    ('177078ab-beef-4a47-8d0f-2a6e8cfa3f7c', 'aee85a20-c385-4ddd-9c2c-746b563d060b', 3, 'And the Bag''s in the River', 'Walt struggles with guilt over his actions.', 49, TRUE, '2008-02-10'),
    ('eacce30e-efa5-4d10-8f69-2e2054b15fdf', 'aee85a20-c385-4ddd-9c2c-746b563d060b', 4, 'Cancer Man', 'Walt has still not told his family about his cancer.', 49, TRUE, '2008-02-17'),
    ('77678461-7c4d-42e5-87d2-b5010efd8624', 'aee85a20-c385-4ddd-9c2c-746b563d060b', 5, 'Gray Matter', 'Walt and Skyler attend a party hosted by his old colleagues.', 48, TRUE, '2008-02-24')
ON CONFLICT DO NOTHING;

-- Ratings
INSERT INTO ratings (profile_id, content_id, score) VALUES
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', '4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 9),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'f5380047-7d0b-4089-b9cf-a1bdac574677', 10),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', 10),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', '4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 8),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', 'bb142616-28fd-4c99-8b22-354fa174ff3c', 9),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', '594af880-5e2b-4694-b31c-1a21a1e26554', 10),
    ('cabf83ee-0da6-427c-ba04-9b57d2eab625', '5cf1cd21-d83f-4713-bdfe-eae7b946e453', 10),
    ('cabf83ee-0da6-427c-ba04-9b57d2eab625', '12402963-381b-43bb-b3d6-a2ddc78b3911', 8)
ON CONFLICT DO NOTHING;

-- Watchlist entries
INSERT INTO watchlist (profile_id, content_id) VALUES
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'bb142616-28fd-4c99-8b22-354fa174ff3c'),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', '594af880-5e2b-4694-b31c-1a21a1e26554'),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', 'f5380047-7d0b-4089-b9cf-a1bdac574677'),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', 'ae6fe925-8451-44c0-8db4-d10684453c15'),
    ('cabf83ee-0da6-427c-ba04-9b57d2eab625', '4d88c5c6-e72b-42ae-b47b-b4c5c58884b3')
ON CONFLICT DO NOTHING;

-- Watch history (spread across partitions)
INSERT INTO watch_history (profile_id, content_id, progress_seconds, total_seconds, completed, watched_at) VALUES
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', '4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 8880, 8880, TRUE,  NOW() - INTERVAL '3 days'),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'f5380047-7d0b-4089-b9cf-a1bdac574677', 5400, 10140, FALSE, NOW() - INTERVAL '2 days'),
    ('a311b801-a4dc-469e-9286-6f1efe275f7c', 'a1e0ef53-cd9a-4c5f-8cad-330416d6cdbe', 9120, 9120, TRUE,  NOW() - INTERVAL '10 days'),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', '4d88c5c6-e72b-42ae-b47b-b4c5c58884b3', 3600, 8880, FALSE, NOW() - INTERVAL '1 day'),
    ('a623f94b-2053-46a1-9d37-239bcd2ec715', '594af880-5e2b-4694-b31c-1a21a1e26554', 3480, 3480, TRUE,  NOW() - INTERVAL '5 days'),
    ('cabf83ee-0da6-427c-ba04-9b57d2eab625', '5cf1cd21-d83f-4713-bdfe-eae7b946e453', 7920, 7920, TRUE,  NOW() - INTERVAL '1 day'),
    ('51a84fbb-35c7-4e6e-9fa7-3a30507b4980', 'bb142616-28fd-4c99-8b22-354fa174ff3c', 9300, 9300, TRUE,  NOW() - INTERVAL '4 hours'),
    ('51a84fbb-35c7-4e6e-9fa7-3a30507b4980', 'ae6fe925-8451-44c0-8db4-d10684453c15', 2700, 2700, TRUE,  NOW() - INTERVAL '6 hours');

SELECT refresh_all_materialized_views();
