import Redis from "ioredis";

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  // ❌ NO TLS HERE
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected (NON-TLS)");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

export default redisClient;
