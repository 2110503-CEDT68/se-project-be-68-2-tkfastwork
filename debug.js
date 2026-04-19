const http = require('http');

const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
}, (res) => {
    let b = '';
    res.on('data', c => b += c);
    res.on('end', () => {
        const t = JSON.parse(b).token;
        
        const payload = JSON.stringify({
            name: "Request Space " + Date.now(),
            address: "Request Street",
            tel: "0888888888",
            opentime: "09:00",
            closetime: "18:00",
            description: "Awesome space to work with more than ten words to pass the validation",
            proofOfOwnership: "http://example.com/proof",
            pics: ["http://example.com/pic1"]
        });

        const r2 = http.request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/v1/coworkingSpaceRequests',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + t
            }
        }, res2 => {
            let b2 = '';
            res2.on('data', c => b2 += c);
            res2.on('end', () => {
                const reqId = JSON.parse(b2).data._id;
                
                const r3 = http.request({
                    hostname: 'localhost',
                    port: 5000,
                    path: '/api/v1/coworkingSpaceRequests/' + reqId + '/review',
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + t
                    }
                }, res3 => {
                    let b3 = '';
                    res3.on('data', c => b3 += c);
                    res3.on('end', () => console.log('RESPONSE3:', res3.statusCode, b3));
                });
                r3.write(JSON.stringify({ status: 'approved' }));
                r3.end();
            });
        });
        r2.write(payload);
        r2.end();
    });
});
req.write(JSON.stringify({ email: 'admin@newman-test.com', password: 'admin123' }));
req.end();
