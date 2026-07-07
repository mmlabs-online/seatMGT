/**
 * Seeds ONLY the people from the "Seat Map C3" floor plan — one Member per
 * named seat. No room / seat / fixture data is created.
 *
 * Re-runnable: members are upserted by a deterministic employeeCode (`C3-001…`),
 * so running it again updates rather than duplicates. Repeated names in the
 * plan (e.g. "Hậu Phan") collapse to a single member.
 *
 *   npx tsx prisma/seed-c3.ts      (or: npm run db:seed:c3)
 */
import { prisma } from "../src/lib/db";

// Every named seat from the plan (Free / "cannot seat" cells are omitted).
const NAMES = [
  "Vũ Hoàng",
  "Linh Nguyễn",
  "Wireless SC/Server/Tới Tr/Bảo Ng",
  "Dương Nguyễn",
  "Trường Đ (ansible)",
  "Xuân Trần",
  "Tùng Trần",
  "Tùng Phan",
  "Hợp Wireless",
  "Hậu Phan",
  "Chiến Nguyễn ZTF",
  "Thạch",
  "AI Intern",
  "Bắc Ng",
  "Lĩnh Trương",
  "Hiên Safeview",
  "Xuyên Thái",
  "Mẫn Soctrip",
  "Ngân Võ (mobile)",
  "Kha AI",
  "Đăng Thái",
  "Kiệt Võ",
  "Long Nguyễn",
  "Trường Bùi",
  "Huấn Trần",
  "Trường Quang",
  "aTom",
  "Nghĩa Hiếu",
  "Bình Trần",
  "Nhất Trương",
  "Trang Hồ (QA)",
  "Đông Trương",
  "Trung Đinh",
  "Trâm Đỗ",
  "Hiền Lâm RB DBS",
  "Xuân Lê",
  "Lan Đỗ",
  "Hoàng Trương",
  "Hương Nguyễn",
  "Thiện Trần",
  "DAS intern",
  "Trâm Bùi",
  "Automotive intern",
  "Minh Trần Soc FE",
  "Vũ Lê",
  "Trinh Đỗ Soc MB",
  "Tú",
  "Nam Dương Soc FE",
  "Bảo",
  "Nguyễn Đặng Soc MB",
  "Dương",
  "Ngọc Từ",
  "Vinh Đỗ",
  "An Ôn",
  "Nhân Võ",
  "Nam Hoàng",
  "RPA server",
  "Phúc Phạm",
  "Tuấn Đặng",
  "Toàn Trà",
  "Nhật Đặng",
  "Hardware - showroom",
  "Tùng Vương (Director)",
];

async function main() {
  // De-dupe while keeping first-seen order (deterministic employeeCode).
  const unique = [...new Set(NAMES.map((n) => n.trim()))];

  console.log(`Seeding ${unique.length} members…`);
  let i = 0;
  for (const name of unique) {
    i++;
    const employeeCode = `C3-${String(i).padStart(3, "0")}`;
    await prisma.member.upsert({
      where: { employeeCode },
      update: { name },
      create: { name, employeeCode },
    });
  }

  console.log(`Done ✓  ${unique.length} members seeded (employeeCode C3-001…C3-${String(unique.length).padStart(3, "0")}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
