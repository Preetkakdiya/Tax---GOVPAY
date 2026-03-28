const PDFDocument = require('pdfkit');
const fs = require('fs');

const generateSalarySlip = (employee, salaryRecord, filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(filePath));

      doc.fontSize(20).text('GovPay+ Salary Slip', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Employee Name: ${employee.full_name}`);
      doc.text(`PAN Number: XXXXXX${employee.pan_number.slice(-4)}`);
      doc.text(`Month/Year: ${salaryRecord.month} ${salaryRecord.year}`);
      doc.moveDown();

      doc.text(`Gross Salary: INR ${salaryRecord.gross_salary}`);
      doc.text(`Taxable Income: INR ${salaryRecord.taxable_income}`);
      doc.text(`Tax Deducted: INR ${salaryRecord.tax}`);
      doc.text(`Cess: INR ${salaryRecord.cess}`);
      doc.moveDown();

      doc.fontSize(14).text(`Net Salary: INR ${salaryRecord.net_salary}`, { underline: true });
      doc.moveDown();
      doc.fontSize(10).text(`Verification ID: ${salaryRecord._id}`, { align: 'right' });

      doc.end();
      resolve(filePath);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateSalarySlip };
