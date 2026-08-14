import "dotenv/config";
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function backfillCancelTokens() {
  const missing = await prisma.appointment.findMany({
    where: { cancelToken: null },
    select: { id: true },
  });
  for (const row of missing) {
    await prisma.appointment.update({
      where: { id: row.id },
      data: { cancelToken: randomBytes(6).toString("base64url") },
    });
  }
  if (missing.length > 0) {
    console.log(`Backfilled cancelToken for ${missing.length} appointments`);
  }
}

async function main() {
  await backfillCancelTokens();

  const demoPassword = process.env.DEMO_BARBER_PASSWORD || "barber123";
  const passwordHash = await hash(demoPassword, 12);

  // Only create the demo barber if missing — never overwrite live edits
  // (displayName, password, SMS settings, etc.) on every Render deploy.
  const dani = await prisma.barber.upsert({
    where: { slug: "dani" },
    update: {},
    create: {
      slug: "dani",
      displayName: "דני הספר",
      username: "dani",
      passwordHash,
      slotMinutes: 30,
      smsPlanEnabled: true,
      workingHours: {
        create: [
          { dayOfWeek: 0, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
          { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
        ],
      },
    },
  });

  const existingHours = await prisma.workingHours.count({
    where: { barberId: dani.id },
  });
  if (existingHours === 0) {
    await prisma.workingHours.createMany({
      data: [
        { barberId: dani.id, dayOfWeek: 0, startTime: "09:00", endTime: "18:00" },
        { barberId: dani.id, dayOfWeek: 1, startTime: "09:00", endTime: "18:00" },
        { barberId: dani.id, dayOfWeek: 2, startTime: "09:00", endTime: "18:00" },
        { barberId: dani.id, dayOfWeek: 3, startTime: "09:00", endTime: "18:00" },
        { barberId: dani.id, dayOfWeek: 4, startTime: "09:00", endTime: "18:00" },
      ],
    });
  }

  console.log(`Demo barber ready: /${dani.slug} (user: dani / ${demoPassword})`);
  console.log("Platform login: PLATFORM_USERNAME / PLATFORM_PASSWORD from .env");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
