/**
 * Omnibus Traders Invoice PDF Generator
 * This script generates a styled, multi-page invoice PDF with wrapping, page breaks,
 * table, headers, grand total, "Rs." placement, and detailed comments.
 */

/**
 * Helper to set font size and weight for the PDF document
 * @param {jsPDF} doc - The jsPDF document instance
 * @param {number} size - Font size in points
 * @param {'normal'|'bold'|'italic'} weight - Font weight/style
 */
function setFont(doc, size, weight = 'normal') {
  doc.setFontSize(size);
  doc.setFont('helvetica', weight);
}

/**
 * Draws the main heading and subtitle at the top of the invoice
 * @param {jsPDF} doc - The PDF document
 * @param {number} pageWidth - Width of the page
 */
function drawHeading(doc, pageWidth) {
  setFont(doc, 20, 'bold');
  doc.setTextColor('#2c3e50');
  doc.text('BILL OF SUPPLY', pageWidth / 2, 23, { align: 'center' });
  setFont(doc, 12, 'normal');
  doc.setTextColor('#34495e');
  doc.text(
    '(Composition Taxable Person, Not Eligible To Collect Tax on Supplies)',
    pageWidth / 2,
    30,
    { align: 'center' }
  );
  doc.setTextColor('#000');
}

/**
 * Draws a subtle horizontal dividing line at the specified Y position
 * @param {jsPDF} doc
 * @param {number} y
 * @param {number} marginLeft
 * @param {number} pageWidth
 */
function drawDivider(doc, y, marginLeft, pageWidth) {
  doc.setDrawColor('#bdc3c7');
  doc.setLineWidth(0.3);
  doc.line(marginLeft, y, pageWidth - marginLeft, y);
}

/**
 * Draws shop details (left) and invoice details (right) horizontally aligned
 * Handles wrapping and vertical alignment for uneven line counts
 * @param {jsPDF} doc
 * @param {object} shopInfo - { name, details: [] }
 * @param {object} orderInfo - { ... }
 * @param {number} marginLeft
 * @param {number} rightX
 * @param {number} y
 * @param {number} pageWidth
 * @returns {number} - The new Y position after drawing
 */
function drawShopAndInvoiceDetails(doc, shopInfo, orderInfo, marginLeft, rightX, y, pageWidth) {
  setFont(doc, 14, 'bold');
  doc.setTextColor('#2980b9');
  doc.text(shopInfo.name, marginLeft, y);
  y += 1;
  doc.text('Invoice Details', rightX, y);
  y += 6;
  setFont(doc, 10, 'normal');
  doc.setTextColor('#000');

  // Calculate max lines for vertical alignment
  const maxLines = Math.max(shopInfo.details.length, Object.keys(orderInfo).length);
  const orderValues = Object.entries(orderInfo).map(([key, val]) => `${key.replace(/([A-Z])/g, ' $1')}: ${val}`);

  // Draw each line, wrapping as needed for shop details
  for (let i = 0; i < maxLines; i++) {
    const shopWrapped = doc.splitTextToSize(shopInfo.details[i] || '', rightX - marginLeft - 10);
    const invoiceLine = orderValues[i] || '';
    const lineCount = Math.max(shopWrapped.length, 1);
    for (let j = 0; j < lineCount; j++) {
      const shopLine = shopWrapped[j] || '';
      doc.text(shopLine, marginLeft, y);
      if (j === 0) doc.text(invoiceLine, rightX, y);
      y += 5;
    }
  }

  // Draw divider below the block
  drawDivider(doc, y, marginLeft, pageWidth);
  y += 7;
  return y;
}

/**
 * Draws billing and shipping info side by side with wrapping and proper spacing
 * @param {jsPDF} doc
 * @param {string[]} billInfo - Billing info lines
 * @param {string[]} shipInfo - Shipping info lines
 * @param {number} marginLeft
 * @param {number} rightX
 * @param {number} y
 * @param {number} pageWidth
 * @returns {number} - New Y position after drawing
 */
function drawBillingShipping(doc, billInfo, shipInfo, marginLeft, rightX, y, pageWidth) {
  setFont(doc, 14, 'bold');
  doc.setTextColor('#2980b9');
  doc.text('Billing Details', marginLeft, y);
  doc.text('Shipping Details', rightX, y);
  setFont(doc, 10, 'normal');
  doc.setTextColor('#000');
  y += 6;

  // Calculate max lines for vertical alignment
  const maxLines = Math.max(billInfo.length, shipInfo.length);

  // Draw each line, wrapping as needed
  for (let i = 0; i < maxLines; i++) {
    const billLine = billInfo[i] ? doc.splitTextToSize(billInfo[i], rightX - marginLeft - 10) : [''];
    const shipLine = shipInfo[i] ? doc.splitTextToSize(shipInfo[i], pageWidth - rightX - 20) : [''];
    const maxWrappedLines = Math.max(billLine.length, shipLine.length);
    for (let lineIndex = 0; lineIndex < maxWrappedLines; lineIndex++) {
      if (billLine[lineIndex]) doc.text(billLine[lineIndex], marginLeft, y);
      if (shipLine[lineIndex]) doc.text(shipLine[lineIndex], rightX, y);
      y += 5;
    }
  }

  // Draw divider below the block
  drawDivider(doc, y-3, marginLeft, pageWidth);
  y += 7;
  return y;
}

/**
 * Draws the product table headers and rows, with wrapped description,
 * page breaks, and "Rs." under Unit Price header and grand total.
 * @param {jsPDF} doc
 * @param {number} startX - Left X position
 * @param {number} startY - Top Y position
 * @param {number} marginLeft
 * @param {number[]} colWidths - Array of column widths
 * @param {HTMLElement} tableBody - The tbody element containing product rows
 * @param {number} pageWidth
 * @returns {object} - { y, grandTotal, currentPage }
 */
function drawProductTable(doc, startX, startY, marginLeft, colWidths, tableBody, pageWidth) {
  // Table column headers
  const headers = ['Sl No', 'HSN Code', 'Description', 'Qty', 'Unit Price', 'Total'];

  /**
   * Draws the table headers and "Rs." below Unit Price
   * @param {number} yPos
   */
  function drawHeaders(yPos) {
    setFont(doc, 12, 'bold');
    doc.setFillColor('#ecf0f1');
    doc.setTextColor('#34495e');
    // Draw header background
    doc.rect(startX, yPos - 5, colWidths.reduce((a, b) => a + b, 0), 10, 'F');
    // Draw each header text centered
    let colX = startX;
    for (let i = 0; i < headers.length; i++) {
      const colCenterX = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + colWidths[i] / 2;
      doc.text(headers[i], colCenterX, yPos, { align: 'center' });
    }
    // Draw header borders
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const headerTop = yPos - 5;
    const headerBottom = yPos + 5;
    doc.setDrawColor('#7f8c8d');
    doc.setLineWidth(0.3);
    for (let i = 0; i <= colWidths.length; i++) {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.line(x, headerTop, x, headerBottom);
    }
    doc.line(startX, headerTop, startX + tableWidth, headerTop);
    doc.line(startX, headerBottom, startX + tableWidth, headerBottom);
  }

  // Draw initial headers at the top of the table
  drawHeaders(startY);

  setFont(doc, 10, 'normal');
  doc.setTextColor('#000');

  // Get all product rows and initialize state
  const rows = Array.from(tableBody.getElementsByTagName('tr'));
  let y = startY + 5;
  const verticalPadding = 2.5;
  const lineHeight = 4.5;
  let grandTotal = 0;
  let currentPage = doc.internal.getCurrentPageInfo().pageNumber;

  // Loop through each row and draw cells, handling page breaks and wrapping
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const cells = row.getElementsByTagName('td');
    const slNo = cells[0].textContent;
    const hsnNo = cells[1].textContent;
    const desc = cells[2].textContent;
    const qty = cells[3].textContent;
    const unitPrice = cells[4].textContent;
    const total = cells[5].textContent;
    // Calculate column centers for text alignment
    const colCenters = [];
    let colX = startX;
    for (let i = 0; i < colWidths.length; i++) {
      colCenters.push(colX + colWidths[i] / 2);
      colX += colWidths[i];
    }
    // Wrap description text within Description column
    const wrappedDesc = doc.splitTextToSize(desc, colWidths[2] - 8);
    const cellHeight = wrappedDesc.length * lineHeight;
    // If row would overflow page, add new page and redraw headers
    if (y + cellHeight + verticalPadding * 2 > 280) {
      doc.addPage();
      currentPage++;
      y = 20;
      drawHeaders(y);
      y += 5;
    }
    // Calculate vertical center for the row
    const cellYCenter = y + (cellHeight + verticalPadding * 2) / 2;
    // Draw each cell’s content, with wrapping for description
    doc.text(slNo, colCenters[0], cellYCenter, { align: 'center' });
    doc.text(hsnNo, colCenters[1], cellYCenter, { align: 'center' });
    // Description: wrap and vertically center lines
    const descYCenter = y + (cellHeight + verticalPadding * 2) / 2 - (wrappedDesc.length - 1) * lineHeight / 2;
    for (let i = 0; i < wrappedDesc.length; i++) {
      doc.text(wrappedDesc[i], colCenters[2], descYCenter + i * lineHeight, { align: 'center' });
    }
    doc.text(qty, colCenters[3], cellYCenter, { align: 'center' });
    doc.text(unitPrice, colCenters[4], cellYCenter + 0.5, { align: 'center' });
    doc.text(total, colCenters[5], cellYCenter + 0.5, { align: 'center' });
    // Draw borders around each cell
    const rowTop = y;
    doc.setDrawColor('#7f8c8d');
    doc.setLineWidth(0.3);
    let cellX = startX;
    for (let i = 0; i < colWidths.length; i++) {
      doc.rect(cellX, rowTop, colWidths[i], cellHeight + verticalPadding * 2);
      cellX += colWidths[i];
    }
    // Move y down and accumulate grand total
    y += cellHeight + verticalPadding * 2;
    grandTotal += parseFloat(total) || 0;
  }
  // Return final Y, grand total, and last page number for further drawing
  return { y, grandTotal, currentPage };
}

/**
 * Converts a number into words (Indian numbering), supports rupees and paise
 * @param {number} amount
 * @returns {string}
 */
function numberToWords(amount) {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  // Separate rupees and paise
  const num = Math.floor(amount);
  const paise = Math.round((amount - num) * 100);
  const numStr = num.toString();
  if (numStr.length > 9) return 'Overflow';
  const n = ('000000000' + numStr).substr(-9).match(/(\d{2})(\d{2})(\d{2})(\d{3})/);
  if (!n) return;
  let str = '';
  str += (n[1] !== '00') ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
  str += (n[2] !== '00') ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
  str += (n[3] !== '00') ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
  str += (n[4] !== '000') ? 
    (a[Number(n[4][0])] ? a[n[4][0]] + ' Hundred ' : '') +
    ((n[4][1] !== '0') ? (b[n[4][1]] + ' ') : '') +
    ((n[4][1] === '1') ? a[n[4].slice(1)] : (a[n[4][2]] || '')) + ' '
    : '';
  str = str.replace(/\s+/g, ' ').trim() + ' Rupees';
  if (paise > 0) {
    let paiseStr = '';
    if (paise < 20) {
      paiseStr = a[paise];
    } else {
      paiseStr = b[Math.floor(paise / 10)] + ' ' + a[paise % 10];
    }
    str += ' and ' + paiseStr.trim() + ' Paise';
  }
  return str.trim() + ' Only';
}

/**
 * Main function to generate the invoice PDF
 * Draws all invoice sections, product table, grand total, Rs. headers, and handles page breaks.
 */
function generatePDF(shopname, address, shopdistrict, shopstate, shoppincode, phone, email, gst, ac_no, bank_name, branch, ifsc, OrderNo,
      OrderDate, InvoiceNo, InvoiceDate, billName, billPhone, billEmail, billAddress, billDistrict, billState, billPincode,
      shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, paymentMode) {

  // --- PDF initialization and page setup ---
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const rightX = 140;

  // Draw rounded border around the invoice page for a professional look
  doc.setDrawColor('#34495e');
  doc.setLineWidth(1.2);
  doc.roundedRect(10, 10, pageWidth - 20, pageHeight - 20, 7, 7);

  // --- Heading section ---
  drawHeading(doc, pageWidth);

  // --- Prepare shop and invoice info objects ---
  const shopInfo = {
    name: shopname,
    details: [
      address,
      `${shopdistrict}, ${shopstate} - ${shoppincode}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `GST No: ${gst}`,
    ],
  };
  const orderInfo = {
    OrderNo,
    OrderDate,
    InvoiceNo,
    InvoiceDate,
  };
  let y = 45;

  // --- Draw shop and invoice details side by side ---
  y = drawShopAndInvoiceDetails(doc, shopInfo, orderInfo, marginLeft, rightX, y, pageWidth);

  // --- Prepare billing and shipping info arrays, wrapping addresses ---
  const wrappedBillAddress = doc.splitTextToSize(billAddress, rightX - marginLeft - 10);
  const wrappedShipAddress = doc.splitTextToSize(shipAddress, pageWidth - rightX - 20);
  const billInfo = [
    billName,
    ...wrappedBillAddress,
    `${billDistrict}, ${billState} - ${billPincode}`,
    `Phone: ${billPhone}`,
    billEmail ? `Email: ${billEmail}` : '',
  ];
  const shipInfo = [
    shipName,
    ...wrappedShipAddress,
    `${shipDistrict}, ${shipState} - ${shipPincode}`,
    `Phone: ${shipPhone}`,
    shipEmail ? `Email: ${shipEmail}` : '',
  ];

  // --- Draw billing and shipping details ---
  y = drawBillingShipping(doc, billInfo, shipInfo, marginLeft, rightX, y, pageWidth);

  // --- Product table: headers and rows ---
  // Column widths for each table column
  const colWidths = [15, 30, 66, 15, 27, 27];
  const tableBody = document.getElementById('productTableBody');
  const tableY = y + 3;
  // Draw the product table, handling page breaks and wrapping
  const { y: afterTableY, grandTotal, currentPage } = drawProductTable(
    doc,
    marginLeft,
    tableY,
    marginLeft,
    colWidths,
    tableBody,
    pageWidth
  );
  y = afterTableY + 6;

  // --- Switch to last page before drawing grand total and other details ---
  doc.setPage(currentPage);

  // --- Grand total row: show grand total (numeric) and in words, with "Rs." under Unit Price ---
  const tableStartX = marginLeft;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  // Calculate widths for label and total in words columns
  //const labelSpan = colWidths[0] + colWidths[1] * 0.6;
  const totalInWordsSpan = colWidths[1] * 0.4 + colWidths[2] + colWidths[3] + colWidths[4];
  // Generate total in words
  const totalInWords = numberToWords(grandTotal);
  // Split wrapped words into lines within allocated width
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const wordsWidth = totalInWordsSpan;
  const wrappedWords = doc.splitTextToSize(totalInWords, wordsWidth);
  // Calculate dynamic box height for the grand total row
  const lineHeight = 5;
  const grandBoxHeight = Math.max(14, wrappedWords.length * lineHeight + 8);
  const grandBoxY = y;
  // Draw background box for grand total row
  doc.setDrawColor('#34495e');
  doc.setFillColor('#ecf0f1');
  doc.rect(tableStartX, grandBoxY, tableWidth, grandBoxHeight, 'F');
  // Draw "Grand Total:" label, vertically centered
  setFont(doc, 10, 'bold');
  doc.setTextColor('#2c3e50');
  const labelX = tableStartX + 2;
  doc.text('Grand Total:', labelX, grandBoxY + grandBoxHeight / 2, { align: 'left', baseline: 'middle' });
  // Draw wrapped total in words, left-aligned after label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const wordsStartX = labelX + doc.getTextWidth('Grand Total:') + 4;
  const firstLineY = grandBoxY + grandBoxHeight / 2;
  doc.text(wrappedWords[0], wordsStartX, firstLineY, { align: 'left', baseline: 'middle' });
  for (let i = 1; i < wrappedWords.length; i++) {
    doc.text(wrappedWords[i], wordsStartX, firstLineY + i * lineHeight, { align: 'left' });
  }
  // Draw grand total numeric value, right edge of last column, vertically centered
  const totalNumberX = tableStartX + colWidths.slice(0, 6).reduce((a, b) => a + b, 0) - 6;
  const totalNumberY = grandBoxY + grandBoxHeight / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setCharSpace(0.1);
  doc.text(`${grandTotal.toFixed(2)}`, totalNumberX, totalNumberY, { align: 'right', baseline: 'middle' });
  doc.setCharSpace(0);
  // Draw "Rs." below the Unit Price column in grand total box
  setFont(doc, 10, 'bold');
  doc.setTextColor('#34495e');
  const rsX = marginLeft + colWidths.slice(0, 4).reduce((a, b) => a + b, 0) + colWidths[4] * 0.88;
  const rsY = grandBoxY + grandBoxHeight / 2 + 1.2;
  doc.text('Rs.', rsX, rsY, { align: 'center' });
  // Update y for next section
  y = grandBoxY + grandBoxHeight+15;

  // --- Payment Mode section ---
  setFont(doc, 14, 'bold');
  doc.setTextColor('#2980b9');
  doc.text('Payment Mode:', marginLeft,y);
  setFont(doc, 12, 'normal');
  doc.setTextColor('#000');
  doc.text(paymentMode, marginLeft + 38, y);
  y += 18;

  // --- Bank Details section, with spacing between fields ---
  setFont(doc, 14, 'bold');
  doc.setTextColor('#2980b9');
  doc.text('Bank Details:', marginLeft, y);
  y += 8;
  setFont(doc, 12, 'normal');
  doc.setTextColor('#000');
  doc.text('A/C No:', marginLeft, y);
  doc.text(ac_no, marginLeft + 16, y);
  y += 6;
  doc.text('IFSC:', marginLeft, y);
  doc.text(ifsc, marginLeft + 12, y);
  y += 6;
  doc.text('Bank Name:', marginLeft, y);
  doc.text(bank_name, marginLeft + 25, y);
  y += 6;
  doc.text('Branch:', marginLeft, y);
  doc.text(branch, marginLeft + 17, y);
  y += 5;

  // --- Signature and stamp (right aligned) ---
  setFont(doc, 12, 'normal');
  doc.text('Signature: ', rightX, y);
  y+=5
  setFont(doc, 14, 'bold');
  doc.text('For Omnibus Traders', rightX, y);
  y+=5
  setFont(doc, 10, 'normal');
  doc.text('(Rubber stamp of the firm)', rightX, y);

  // --- Footer thank you message ---
  setFont(doc, 12, 'italic');
  doc.setTextColor('#7f8c8d');
  doc.text('Thank you for your business!', marginLeft+60, pageHeight - 30);

  // --- Page numbering for all pages ---
  const pageCount = doc.internal.getNumberOfPages();
  setFont(doc, 8, 'normal');
  doc.setTextColor('#7f8c8d');
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 15);
  }

  // --- Save the generated PDF with the invoice number in the filename ---
  doc.save(`Invoice_${InvoiceNo || 'unknown'}.pdf`);
  const pdfBlob = doc.output('blob');
  return pdfBlob;

}

window.generatePDF = generatePDF;