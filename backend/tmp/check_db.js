const { Client } = require('pg');
require('dotenv').config();

(async () => {
    const client = new Client(process.env.DATABASE_URL);
    await client.connect();
    const res = await client.query("SELECT id, title, trailer_url, full_video_url FROM content WHERE id = '594af880-5e2b-4694-b31c-1a21a1e26554'");
    console.log(JSON.stringify(res.rows[0], null, 2));
    await client.end();
})();
