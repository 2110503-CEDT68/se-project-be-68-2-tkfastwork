const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'collection.json');
const collection = JSON.parse(fs.readFileSync(file, 'utf8'));

// Find the submit request test and give it a unique name
const reqGroup = collection.item.find(i => i.name === "2.1 Requests & Reviews");
if (reqGroup) {
  const submitReq = reqGroup.item.find(i => i.name === "Submit Space Request (User)");
  if (submitReq) {
    const raw = JSON.parse(submitReq.request.body.raw);
    raw.name = "Request Space " + Math.floor(Math.random() * 1000000);
    submitReq.request.body.raw = JSON.stringify(raw);
  }
}

fs.writeFileSync(file, JSON.stringify(collection, null, 2), 'utf8');
console.log('Collection updated with unique request name.');
