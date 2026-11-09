// Frontend/src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 1. Download Full Statement
export const generateTransactionPDF = (transactions, userName = 'Investor') => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(10, 16, 29);
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TradeYield', 14, 22);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Financial Account Statement', 14, 30);

  // Statement Meta Info
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(`Account Holder: ${userName}`, 14, 48);
  doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 54);
  doc.text(`Total Records: ${transactions.length}`, 14, 60);

  // Table Data Mapping
  const tableRows = transactions.map((tx) => [
    new Date(tx.createdAt).toLocaleDateString(),
    tx.type.replace(/_/g, ' '),
    `$${(tx.amount || 0).toFixed(2)} USDT`,
    `$${(tx.feeDeducted || 0).toFixed(2)} USDT`,
    tx.status,
    tx.txHash ? `${tx.txHash.substring(0, 10)}...` : 'N/A',
  ]);

  autoTable(doc, {
    startY: 66,
    head: [['Date', 'Transaction Type', 'Gross Amount', 'Fee', 'Status', 'Tx Hash']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [0, 212, 255],
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save(`TradeYield_Statement_${new Date().toISOString().split('T')[0]}.pdf`);
};

// 2. Download Individual Transaction Receipt
export const generateReceiptPDF = (tx, userName = 'Investor') => {
  const doc = new jsPDF({
    format: 'a5',
    unit: 'mm',
  });

  // Header Box
  doc.setFillColor(10, 16, 29);
  doc.rect(0, 0, 148, 32, 'F');

  doc.setTextColor(0, 212, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TradeYield', 12, 18);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Transaction Receipt', 12, 25);

  // Receipt Content Box
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.rect(12, 38, 124, 105);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('TRANSACTION RECEIPT DETAILS', 16, 46);

  const receiptFields = [
    ['Transaction ID:', tx._id || 'N/A'],
    ['Account Holder:', userName],
    ['Type:', tx.type ? tx.type.replace(/_/g, ' ') : 'N/A'],
    ['Date & Time:', new Date(tx.createdAt).toLocaleString()],
    ['Gross Amount:', `$${(tx.amount || 0).toFixed(2)} USDT`],
    ['Platform Fee:', `$${(tx.feeDeducted || 0).toFixed(2)} USDT`],
    ['Net Amount:', `$${((tx.amount || 0) - (tx.feeDeducted || 0)).toFixed(2)} USDT`],
    ['Status:', tx.status || 'PENDING'],
    ['Blockchain / Tx Hash:', tx.txHash || 'Off-chain Ledger'],
  ];

  autoTable(doc, {
    startY: 50,
    margin: { left: 16, right: 16 },
    body: receiptFields,
    theme: 'plain',
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 42 },
      1: { fontStyle: 'normal' },
    },
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an electronically generated proof of transaction from TradeYield Platform.', 12, 152);

  doc.save(`TradeYield_Receipt_${tx._id ? tx._id.substring(0, 8) : 'tx'}.pdf`);
};