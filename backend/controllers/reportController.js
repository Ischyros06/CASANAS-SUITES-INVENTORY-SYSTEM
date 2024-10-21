const PDFDocument = require('pdfkit');
const { submittedReports } = require('../models/SubmittedReportsModel');
const fs = require('fs'); // Use this to handle file streams

const renderReportPage = async (req, res) => {
    try {
        const reports = await submittedReports.find().sort({ createdAt: -1 });
        // Format the createdAt date in each report
        const formattedReports = reports.map(report => {
            const date = new Date(report.createdAt);
            const formattedDate = date.toLocaleString('en-US', {
                timeZone: 'Asia/Singapore', // Change the timezone to your desired Asia timezone
                hour12: true, // Use 12-hour format
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            return { ...report.toObject(), createdAt: formattedDate };
        });
        res.render('report', { reportData: formattedReports });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ message: error.message });
    }
};

//This function might not be needed anymore
const getDownloadTemp = async (req, res) => {
    try {
        // Fetch the report data from the database
        const reports = await submittedReports.find().sort({ createdAt: -1 });

        // Check if reports exist
        if (!reports || reports.length === 0) {
            return res.status(404).send({ message: 'No reports found.' });
        }

        // Format the createdAt date for the first report
        const formattedReport = {
            ...reports[0].toObject(), // Convert Mongoose document to plain JavaScript object
            createdAt: reports[0].createdAt.toLocaleString('en-US', {
                timeZone: 'Asia/Singapore',
                hour12: true,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        // Create a new PDF document
        const doc = new PDFDocument();

        // Set response headers for the PDF
        res.setHeader('Content-disposition', `attachment; filename="${formattedReport.userName}_${formattedReport.createdAt}_report.pdf"`);
        res.setHeader('Content-type', 'application/pdf');

        // Pipe the PDF data to the response
        doc.pipe(res);

        // Add title and report details to the PDF
        doc.fontSize(20).text('Report', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).text(`Account: ${formattedReport.userName}`);
        doc.text(`Date: ${formattedReport.createdAt}`);
        doc.moveDown();

        doc.text('Items:', { underline: true });
        doc.moveDown(0.5);

        // Add table headers for items
        doc.fontSize(10).text('Product ID', { continued: true, width: 100 });
        doc.text('Product', { continued: true, width: 100 });
        doc.text('Quantity', { continued: true, width: 100 });
        doc.text('Unit', { width: 100 });
        doc.moveDown(0.5);

        // Add report data items to the PDF
        formattedReport.reportData.forEach(item => {
            doc.text(item.productId, { continued: true, width: 100 });
            doc.text(item.product, { continued: true, width: 100 });
            doc.text(item.quantitySubtracted.toString(), { continued: true, width: 100 });
            doc.text(item.unit, { width: 100 });
            doc.moveDown(0.5);
        });

        // Finalize the PDF document and send it
        doc.end();

    } catch (error) {
        console.error('Error generating PDF report:', error.message);
        res.status(500).send({ message: error.message });
    }
};

module.exports = { renderReportPage, getDownloadTemp };