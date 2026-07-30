import { readStore, updateStore } from './src/lib/store';
import { getPrisma } from './src/lib/prisma';

async function main() {
  try {
    console.log("Reading store...");
    const data = await readStore();
    console.log("Store read successfully. Users:", data.users.length);

    console.log("Updating store...");
    await updateStore((d) => {
        d.services.push({
            id: 'srv-test',
            name: 'Test Service',
            category: 'Kiloan',
            unit: 'KG',
            price: 5000,
            cost: 0,
            estimatedDuration: '1 Day',
            isActive: true
        });
    });
    console.log("Store updated successfully!");
  } catch (e) {
    console.error("ERROR OCCURRED:", e);
  } finally {
    await getPrisma().$disconnect();
  }
}
main();
