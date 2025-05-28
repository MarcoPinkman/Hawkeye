"use server";

import postgres from 'postgres';
// import 'dotenv/config';

// 从环境变量读取配置
// 创建数据库连接
const sql = postgres({
  host: 'localhost',
  port: Number(5432),
  username: 'postgres',
  password: 'password',
  database: 'cctv_event',
  ssl: false // 生产环境建议启用 SSL
});

// import { neon } from "@neondatabase/serverless";
// const sql = neon(`${process.env.DATABASE_URL}`);

export type DataItem = {
  event_id: number;
  event_timestamp: string;
  event_code: string;
  event_description: string;
  event_video_url: string;
  event_detection_explanation_by_ai: string;
};

export async function fetchData(): Promise<DataItem[]> {
  try {
    const data = (await sql`SELECT * FROM event_logs LIMIT 100`) as DataItem[];
    return data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return [];
  }
}
