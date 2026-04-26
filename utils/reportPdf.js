const PDFDocument = require("pdfkit");

const buildOwnerReportPdf = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Intl.DateTimeFormat("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        }).format(new Date(dateString));
      };

      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#0F172A")
        .text("EXECUTIVE PERFORMANCE REPORT", { align: "center" });
      doc.moveDown(1.5);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#1E293B")
        .text("OWNER INFORMATION");
      doc.font("Helvetica").fillColor("#334155");
      doc.text(`Name: ${reportData.owner.name || "Unknown"}`);
      doc.text(`Generated At: ${formatDate(reportData.generatedAt)}`);
      doc.text(
        `Report Window: ${formatDate(reportData.window.from)} - ${formatDate(reportData.window.to)}`,
      );
      doc.moveDown(1.5);

      doc.font("Helvetica-Bold").fillColor("#1E293B").text("PORTFOLIO SUMMARY");
      doc.font("Helvetica").fillColor("#334155");
      doc.text(`Total Spaces: ${reportData.totals.totalSpaces}`);
      doc.text(`Total Bookings: ${reportData.totals.totalBookings}`);
      doc.text(`Unique Users: ${reportData.totals.totalUniqueUsers}`);
      doc.moveDown(1.5);

      doc
        .lineWidth(1)
        .strokeColor("#E2E8F0")
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke();
      doc.moveDown(1.5);

      if (!reportData.spaces || reportData.spaces.length === 0) {
        doc
          .font("Helvetica")
          .text("No coworking spaces are assigned to this owner yet.");
        doc.end();
        return;
      }

      reportData.spaces.forEach((space, index) => {
        if (doc.y > 650) doc.addPage();

        doc.rect(50, doc.y, 495, 22).fill("#F1F5F9");
        doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(11);
        doc.text(
          `SPACE ${index + 1}: ${space.spaceName.toUpperCase()}`,
          60,
          doc.y - 15,
        );
        doc.y += 12;

        doc.fillColor("#334155").font("Helvetica").fontSize(10);
        doc.text(`Address: ${space.address || "N/A"}`);
        doc.text(
          `Operating Hours: ${space.openTime || "N/A"} - ${space.closeTime || "N/A"}`,
        );
        doc.moveDown(0.8);

        doc.font("Helvetica-Bold").text("Key Metrics:");
        doc.font("Helvetica");
        doc.text(
          `Bookings: ${space.totalBookings} | Unique Users: ${space.totalUniqueUsers} | Avg Duration: ${space.avgBookingDurationMinutes} mins`,
        );

        const peakHourLine =
          space.peakHours && space.peakHours.length > 0
            ? space.peakHours
                .map(
                  (h) => `${String(h.hour).padStart(2, "0")}:00 (${h.count})`,
                )
                .join(", ")
            : "No peak data";
        doc.text(`Peak Hours: ${peakHourLine}`);
        doc.moveDown(0.8);

        doc.font("Helvetica-Bold").text("Room Utilization:");
        doc.font("Helvetica");
        if (!space.roomUtilization || space.roomUtilization.length === 0) {
          doc.text("No rooms found.", { indent: 15 });
        } else {
          space.roomUtilization.forEach((room) => {
            doc.text(
              `• ${room.roomName} (${room.roomType}) | ${room.bookingCount} bookings | ${room.totalHoursBooked} hrs | ${room.utilizationPercent}% utilization`,
              { indent: 15 },
            );
          });
        }
        doc.moveDown(0.8);

        if (space.insights && space.insights.length > 0) {
          doc.font("Helvetica-Bold").text("Insights & Recommendations:");
          doc.font("Helvetica");
          space.insights.forEach((insight) => {
            doc.text(`• ${insight.message}`, { indent: 15 });
          });
        }
        doc.moveDown(1.5);

        doc
          .lineWidth(0.5)
          .strokeColor("#E2E8F0")
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();
        doc.moveDown(1.5);
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  buildOwnerReportPdf,
};
