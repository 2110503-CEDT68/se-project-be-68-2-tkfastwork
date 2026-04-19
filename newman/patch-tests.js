const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'collection.json');
const collection = JSON.parse(fs.readFileSync(file, 'utf8'));

// 1. Add variables
const vars = collection.variable;
if (!vars.find(v => v.key === 'requestId')) vars.push({ key: 'requestId', value: '' });
if (!vars.find(v => v.key === 'roomId')) vars.push({ key: 'roomId', value: '' });

// 2. Fix original "Create Space (Admin)" missing description
const adminGroup = collection.item.find(i => i.name.includes("Admin - Manage Spaces"));
if (adminGroup) {
  const createSpace = adminGroup.item.find(i => i.name === "Create Space (Admin)");
  if (createSpace) {
    const rawData = JSON.parse(createSpace.request.body.raw);
    if (!rawData.description) {
        rawData.description = "A standard description to satisfy the new validation rules.";
        createSpace.request.body.raw = JSON.stringify(rawData);
    }
  }

  // Add Toggle Visibility to this group
  adminGroup.item.push({
    name: "Toggle Space Visibility",
    event: [{ listen: "test", script: { exec: [
      "pm.test('Status 200', () => pm.response.to.have.status(200));",
      "pm.test('Returns visibility', () => pm.expect(pm.response.json().data.isVisible).to.be.a('boolean'));"
    ]}}],
    request: {
      method: "PATCH", url: "{{baseUrl}}/coworkingSpaces/{{spaceId}}/visibility",
      header: [
        { key: "Content-Type", value: "application/json" },
        { key: "Authorization", value: "Bearer {{adminToken}}" }
      ]
    }
  });
}

// 3. Create Request Management test group
const requestGroup = {
  name: "2.1 Requests & Reviews",
  item: [
    {
      name: "Submit Space Request (User)",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 201', () => pm.response.to.have.status(201));",
        "const j = pm.response.json(); pm.collectionVariables.set('requestId', j.data._id);"
      ]}}],
      request: {
        method: "POST", url: "{{baseUrl}}/coworkingSpaceRequests",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{userToken}}" }
        ],
        body: { mode: "raw", raw: JSON.stringify({
          name: "Test Request Space", address: "Request Street", tel: "0888888888",
          opentime: "09:00", closetime: "18:00", description: "Awesome space to work",
          proofOfOwnership: "http://example.com/proof", pics: ["http://example.com/pic1"]
        })}
      }
    },
    {
      name: "Get All Requests (Admin)",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 200', () => pm.response.to.have.status(200));"
      ]}}],
      request: {
        method: "GET", url: "{{baseUrl}}/coworkingSpaceRequests/all",
        header: [ { key: "Authorization", value: "Bearer {{adminToken}}" } ]
      }
    },
    {
      name: "Review Request (Admin Approve)",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 200', () => pm.response.to.have.status(200));",
        "pm.test('Approved', () => pm.expect(pm.response.json().data.status).to.eq('approved'));"
      ]}}],
      request: {
        method: "PATCH", url: "{{baseUrl}}/coworkingSpaceRequests/{{requestId}}/review",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{adminToken}}" }
        ],
        body: { mode: "raw", raw: JSON.stringify({ status: "approved" }) }
      }
    }
  ]
};

// 4. Create Room Management test group
const roomGroup = {
  name: "2.2 Room Management",
  item: [
    {
      name: "Create Room (Admin)",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 201', () => pm.response.to.have.status(201));",
        "const j = pm.response.json(); pm.collectionVariables.set('roomId', j.data._id);"
      ]}}],
      request: {
        method: "POST", url: "{{baseUrl}}/coworkingSpaces/{{spaceId}}/rooms",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{adminToken}}" }
        ],
        body: { mode: "raw", raw: JSON.stringify({
          name: "Meeting Room A", capacity: 10, description: "A nice room"
        })}
      }
    },
    {
      name: "Update Room",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 200', () => pm.response.to.have.status(200));"
      ]}}],
      request: {
        method: "PUT", url: "{{baseUrl}}/rooms/{{roomId}}",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{adminToken}}" }
        ],
        body: { mode: "raw", raw: JSON.stringify({ capacity: 15 }) }
      }
    },
    {
      name: "Delete Room",
      event: [{ listen: "test", script: { exec: [
        "pm.test('Status 200', () => pm.response.to.have.status(200));"
      ]}}],
      request: {
        method: "DELETE", url: "{{baseUrl}}/rooms/{{roomId}}",
        header: [ { key: "Authorization", value: "Bearer {{adminToken}}" } ]
      }
    }
  ]
};

// Remove if they already exist to be safe
collection.item = collection.item.filter(i => i.name !== "2.1 Requests & Reviews" && i.name !== "2.2 Room Management");

// Insert after "2. Admin - Manage Spaces"
const manageSpacesIdx = collection.item.findIndex(i => i.name.includes("Admin - Manage Spaces"));
collection.item.splice(manageSpacesIdx + 1, 0, requestGroup, roomGroup);

fs.writeFileSync(file, JSON.stringify(collection, null, 2), 'utf8');
console.log('Postman collection successfully patched with new API tests!');
