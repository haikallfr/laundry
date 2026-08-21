import { updateStore } from "./src/lib/store";

async function main() {
  try {
    await updateStore((data) => {
      data.settings.storeName = "Family Laundry";
    });
    console.log("Success!");
  } catch (error) {
    console.error("Failed:", error);
  }
}

main();
