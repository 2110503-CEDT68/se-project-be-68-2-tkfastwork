const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'collection.json');
const collection = JSON.parse(fs.readFileSync(file, 'utf8'));

// Make "Test Space Newman" unique
const adminGroup = collection.item.find(i => i.name.includes("Admin - Manage Spaces"));
if (adminGroup) {
  const createSpace = adminGroup.item.find(i => i.name === "Create Space (Admin)");
  if (createSpace) {
    const raw = JSON.parse(createSpace.request.body.raw);
    raw.name = "Newman Unique Space " + Math.floor(Math.random() * 1000000);
    createSpace.request.body.raw = JSON.stringify(raw);
  }
}

fs.writeFileSync(file, JSON.stringify(collection, null, 2), 'utf8');
console.log('Collection updated with unique managed space name.');
