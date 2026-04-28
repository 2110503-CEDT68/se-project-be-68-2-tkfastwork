const PDFDocument = require("pdfkit");

const COLORS = {
  primary: "#1E3A5F",
  secondary: "#2563EB",
  accent: "#3B82F6",
  dark: "#0F172A",
  text: "#334155",
  muted: "#64748B",
  light: "#F8FAFC",
  border: "#E2E8F0",
  white: "#FFFFFF",
  success: "#059669",
  warning: "#D97706",
  cardBg: "#F1F5F9",
};

const PAGE_WIDTH = 595.28;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(dateString));
};

const checkPageBreak = (doc, needed = 80) => {
  if (doc.y + needed > 740) {
    doc.addPage();
    return true;
  }
  return false;
};

const drawRoundedRect = (doc, x, y, w, h, r, fillColor) => {
  doc.save();
  doc.roundedRect(x, y, w, h, r).fill(fillColor);
  doc.restore();
};

const drawMetricCard = (doc, x, y, width, label, value, color) => {
  drawRoundedRect(doc, x, y, width, 52, 4, color);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.white)
    .text(label.toUpperCase(), x + 12, y + 10, { width: width - 24, lineBreak: false });
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.white)
    .text(String(value), x + 12, y + 24, { width: width - 24, lineBreak: false });
};

const drawTableRow = (doc, y, cols, widths, isHeader) => {
  const x0 = MARGIN;
  const rowH = isHeader ? 22 : 20;

  if (isHeader) {
    drawRoundedRect(doc, x0, y, CONTENT_WIDTH, rowH, 3, COLORS.primary);
  }

  let cx = x0 + 8;
  cols.forEach((col, i) => {
    doc
      .font(isHeader ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isHeader ? 8 : 9)
      .fillColor(isHeader ? COLORS.white : COLORS.text)
      .text(String(col), cx, y + (isHeader ? 7 : 5), {
        width: widths[i] - 8,
        align: i === cols.length - 1 ? "right" : "left",
        lineBreak: false,
      });
    cx += widths[i];
  });

  return y + rowH;
};

const drawPeakHoursChart = (doc, peakHours, startY) => {
  const chartX = MARGIN;
  const chartWidth = CONTENT_WIDTH;
  const barMaxHeight = 60;
  const barWidth = Math.floor((chartWidth - 48) / 24) - 2;
  const barGap = 2;

  const maxCount = Math.max(...peakHours.map((h) => h.count), 1);

  const barsStartX = chartX + 24;
  let x = barsStartX;

  peakHours.forEach((h) => {
    const barHeight = Math.max((h.count / maxCount) * barMaxHeight, 0);
    const barY = startY + barMaxHeight - barHeight;

    if (h.count > 0) {
      const intensity = h.count / maxCount;
      const r = Math.round(37 + (59 - 37) * (1 - intensity));
      const g = Math.round(99 + (130 - 99) * (1 - intensity));
      const b = Math.round(235 + (246 - 235) * (1 - intensity));
      const color = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

      doc.save();
      doc
        .roundedRect(x, barY, barWidth, barHeight, 2)
        .fill(color);
      doc.restore();
    }

    if (h.hour % 3 === 0) {
      const label = h.hour === 0 ? "12a" : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? "12p" : `${h.hour - 12}p`;
      doc
        .font("Helvetica")
        .fontSize(6)
        .fillColor(COLORS.muted)
        .text(label, x - 2, startY + barMaxHeight + 4, { width: barWidth + 4, align: "center", lineBreak: false });
    }

    x += barWidth + barGap;
  });

  // Peak label
  const busiest = [...peakHours].sort((a, b) => b.count - a.count)[0];
  if (busiest && busiest.count > 0) {
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(`Peak: ${String(busiest.hour).padStart(2, "0")}:00 (${busiest.count} bookings)`, chartX, startY + barMaxHeight + 14, { width: chartWidth, align: "right", lineBreak: false });
  }

  return startY + barMaxHeight + 26;
};

const buildOwnerReportPdf = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: MARGIN,
        size: "A4",
        bufferPages: true,
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // ── Header ──
      drawRoundedRect(doc, 0, 0, PAGE_WIDTH, 100, 0, COLORS.primary);

      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(COLORS.white)
        .text("EXECUTIVE PERFORMANCE REPORT", MARGIN, 28, {
          width: CONTENT_WIDTH,
          align: "center",
        });

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#94A3B8")
        .text(
          `${reportData.owner.name || "Unknown"} | Generated ${formatDate(reportData.generatedAt)}`,
          MARGIN,
          58,
          { width: CONTENT_WIDTH, align: "center" },
        );
      doc
        .text(
          `Report Window: ${formatDate(reportData.window.from)} — ${formatDate(reportData.window.to)}`,
          MARGIN,
          72,
          { width: CONTENT_WIDTH, align: "center" },
        );

      doc.y = 120;

      // ── Portfolio Summary Cards ──
      const cardWidth = (CONTENT_WIDTH - 16) / 3;
      const cardY = doc.y;
      drawMetricCard(doc, MARGIN, cardY, cardWidth, "Total Spaces", reportData.totals.totalSpaces, COLORS.secondary);
      drawMetricCard(doc, MARGIN + cardWidth + 8, cardY, cardWidth, "Total Bookings", reportData.totals.totalBookings, "#059669");
      drawMetricCard(doc, MARGIN + (cardWidth + 8) * 2, cardY, cardWidth, "Unique Users", reportData.totals.totalUniqueUsers, "#7C3AED");

      doc.y = cardY + 68;

      // ── Spaces ──
      if (!reportData.spaces || reportData.spaces.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.text)
          .text("No coworking spaces are assigned to this owner yet.", {
            width: CONTENT_WIDTH,
          });
        doc.end();
        return;
      }

      reportData.spaces.forEach((space, index) => {
        checkPageBreak(doc, 200);

        // Space header bar
        const headerY = doc.y;
        drawRoundedRect(doc, MARGIN, headerY, CONTENT_WIDTH, 30, 4, COLORS.dark);
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(COLORS.white)
          .text(
            `${index + 1}. ${space.spaceName.toUpperCase()}`,
            MARGIN + 14,
            headerY + 9,
            { width: CONTENT_WIDTH - 28 },
          );
        doc.y = headerY + 40;

        // Address & hours
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(COLORS.muted)
          .text(`${space.address || "N/A"} | Hours: ${space.openTime || "N/A"} – ${space.closeTime || "N/A"}`);
        doc.moveDown(0.8);

        // Key metrics row
        const mCardW = (CONTENT_WIDTH - 16) / 3;
        const mY = doc.y;
        drawMetricCard(doc, MARGIN, mY, mCardW, "Bookings", space.totalBookings, COLORS.secondary);
        drawMetricCard(doc, MARGIN + mCardW + 8, mY, mCardW, "Unique Users", space.totalUniqueUsers, "#059669");
        drawMetricCard(doc, MARGIN + (mCardW + 8) * 2, mY, mCardW, "Avg Duration", `${space.avgBookingDurationMinutes}m`, "#D97706");
        doc.y = mY + 64;

        // Peak Hours Chart
        if (space.peakHours && space.peakHours.length > 0) {
          checkPageBreak(doc, 120);
          doc.x = MARGIN;
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(COLORS.dark)
            .text("Booking Activity by Hour", MARGIN, doc.y);
          doc.moveDown(0.4);
          doc.y = drawPeakHoursChart(doc, space.peakHours, doc.y);
        }

        // Room Utilization Table
        if (space.roomUtilization && space.roomUtilization.length > 0) {
          checkPageBreak(doc, 60 + space.roomUtilization.length * 22);
          doc.x = MARGIN;
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(COLORS.dark)
            .text("Room Utilization", MARGIN, doc.y);
          doc.moveDown(0.4);

          const colWidths = [160, 100, 80, 80, 75];
          let tableY = drawTableRow(
            doc,
            doc.y,
            ["Room", "Type", "Bookings", "Hours", "Utilization"],
            colWidths,
            true,
          );

          space.roomUtilization.forEach((room, ri) => {
            if (tableY + 22 > 740) {
              doc.addPage();
              tableY = MARGIN;
              tableY = drawTableRow(
                doc,
                tableY,
                ["Room", "Type", "Bookings", "Hours", "Utilization"],
                colWidths,
                true,
              );
            }

            if (ri % 2 === 0) {
              drawRoundedRect(doc, MARGIN, tableY, CONTENT_WIDTH, 20, 0, COLORS.light);
            }

            tableY = drawTableRow(
              doc,
              tableY,
              [
                room.roomName,
                room.roomType,
                String(room.bookingCount),
                `${room.totalHoursBooked} hrs`,
                `${room.utilizationPercent}%`,
              ],
              colWidths,
              false,
            );
          });

          doc.x = MARGIN;
          doc.y = tableY + 8;
        }

        // Insights
        if (space.insights && space.insights.length > 0) {
          checkPageBreak(doc, 30 + space.insights.length * 20);
          doc.x = MARGIN;
          doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(COLORS.dark)
            .text("Insights & Recommendations", MARGIN, doc.y);
          doc.moveDown(0.3);

          space.insights.forEach((insight) => {
            checkPageBreak(doc, 24);
            const bulletColor =
              insight.severity === "warning" ? "#DC2626" :
              insight.severity === "highlight" ? "#D97706" : COLORS.secondary;

            const iy = doc.y;
            doc.save();
            doc.circle(MARGIN + 5, iy + 5, 3).fill(bulletColor);
            doc.restore();

            doc
              .font("Helvetica")
              .fontSize(9)
              .fillColor(COLORS.text)
              .text(insight.message, MARGIN + 16, iy, {
                width: CONTENT_WIDTH - 20,
              });
            doc.moveDown(0.3);
          });
        }

        doc.moveDown(1);

        // Divider between spaces
        if (index < reportData.spaces.length - 1) {
          doc
            .lineWidth(0.5)
            .strokeColor(COLORS.border)
            .moveTo(MARGIN, doc.y)
            .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
            .stroke();
          doc.moveDown(1);
        }
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
