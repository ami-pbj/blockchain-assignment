const fs = require("fs");
const path = require("path");

// Path to compiled contract artifact
const srcPath = path.join(
  __dirname,
  "../artifacts/contracts/Marketplace.sol/Marketplace.json"
);

// Path where frontend expects ABI
const destPath = path.join(
  __dirname,
  "../frontend/src/contracts/MarketplaceABI.json"
);

// Make sure destination folder exists
fs.mkdirSync(path.dirname(destPath), { recursive: true });

// Copy the ABI
fs.copyFileSync(srcPath, destPath);
console.log("ABI copied to frontend!");
