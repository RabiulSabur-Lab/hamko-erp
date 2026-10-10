import React from 'react';

export const LedgerPdfTemplate = ({ data }: { data: any }) => {
  const items = data?.items || [];

  return (
    <div
      id="print-ledger"
      className="ledger-pdf-container"
      style={{
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
        padding: '0 10mm',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 12mm 15mm !important;
        }

        @media print {
          html, body {
            visibility: visible !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #root, #__next, .ledger-pdf-container {
            visibility: visible !important;
            display: block !important;
          }

          .ledger-pdf-container {
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 10mm !important;
            box-sizing: border-box !important;
          }

          .ledger-pdf-container,
          .ledger-pdf-container * {
            visibility: visible !important;
          }

          table.clean-ledger-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            display: table !important;
            margin-top: 10px !important;
          }

          table.clean-ledger-table thead {
            display: table-header-group !important;
          }

          table.clean-ledger-table tbody {
            display: table-row-group !important;
          }

          table.clean-ledger-table th,
          table.clean-ledger-table td {
            display: table-cell !important;
            border: 1px solid #000000 !important;
            padding: 6px 8px !important;
            font-size: 10.5px !important;
            line-height: 1.35 !important;
            vertical-align: top !important;
            word-break: break-word !important;
            position: static !important;
          }

          table.clean-ledger-table th {
            background-color: #f2f2f2 !important;
            font-weight: bold !important;
            text-align: left !important;
          }

          table.clean-ledger-table tr {
            display: table-row !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            position: static !important;
          }

          .text-right {
            text-align: right !important;
          }
        }
      `}</style>

      {/* Brand Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ width: '22%', verticalAlign: 'middle', border: 'none', padding: 0 }}>
              <img
                src="/logo.png"
                alt="HAMKO"
                style={{ maxHeight: '42px', maxWidth: '120px', width: 'auto', display: 'block' }}
                onError={(e: any) => {
                  e.currentTarget.src = '/Hamko.png';
                }}
              />
            </td>
            <td style={{ width: '56%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: 0 }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#000000' }}>
                HAMKO INDUSTRIES LTD.
              </h1>
              <p style={{ fontSize: '11.5px', margin: '2px 0 0 0', color: '#000000' }}>Bill of: Cookware Sales Unit</p>
            </td>
            <td style={{ width: '22%', border: 'none', padding: 0 }}></td>
          </tr>
        </tbody>
      </table>

      {/* Divider Line */}
      <div style={{ borderBottom: '2.5px solid #000000', margin: '8px 0 12px 0', width: '100%' }}></div>

      {/* High-Contrast Print-Optimized Statement Banner */}
      <div style={{
        textTransform: 'uppercase',
        letterSpacing: '2px',
        fontWeight: 800,
        fontSize: '13px',
        textAlign: 'center',
        padding: '6px 0',
        backgroundColor: '#f1f5f9',
        color: '#0f172a',
        borderTop: '2px solid #0f172a',
        borderBottom: '2px solid #0f172a',
        margin: '10px 0 12px 0',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}>
        <span style={{ color: '#0f172a', fontWeight: 900 }}>
          CUSTOMER LEDGER STATEMENT
        </span>
      </div>

      {/* Structured Metadata Box with Security Check Badge */}
      <div style={{
        border: '1px solid #0f172a',
        backgroundColor: '#ffffff',
        borderRadius: '2px',
        padding: '10px 14px',
        marginBottom: '14px',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Outlet Name:</strong> <span style={{ fontWeight: 700 }}>{data?.outletName || '—'}</span>
              </td>
              <td style={{ width: '50%', padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Customer Type:</strong> {data?.customerType || '—'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Party Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data?.partyCode || '—'}</span>
              </td>
              <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Area / Market:</strong> {data?.area || '—'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Contact Person:</strong> {data?.contactPerson || '—'}
              </td>
              <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Address:</strong> {data?.address || '—'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '3px 0', verticalAlign: 'middle', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Phone:</strong> {data?.phone || '—'}
              </td>
              <td style={{ padding: '3px 0', verticalAlign: 'middle', color: '#000000', border: 'none' }}>
                <strong style={{ color: '#000000' }}>Statement Date:</strong> <span style={{ fontWeight: 700 }}>{data?.statementDate || data?.date || '—'}</span>
              </td>
            </tr>
            {/* Security Check Status Row */}
            <tr>
              <td colSpan={2} style={{ padding: '6px 0 0 0', borderTop: '1px dashed #94a3b8', borderBottom: 'none', borderLeft: 'none', borderRight: 'none', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: '#000000' }}>Security Check Status:</strong>
                  {Boolean(data?.hasSecurityCheck || data?.securityCheckSubmitted || data?.hasSecurityCheque) ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#e2e8f0',
                      color: '#000000',
                      border: '1.5px solid #000000',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}>
                      [✔] RECEIVED / CLEARED
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      border: '1.5px solid #000000',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}>
                      [✖] NOT SUBMITTED
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stat Cards */}
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px 0', marginBottom: '14px', color: '#000000', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>OPENING BALANCE</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px' }}>৳{data?.openingBalance || 0}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>TOTAL INVOICED (+৳)</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px' }}>+৳ {data?.totalInvoiced || '0'}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>TOTAL PAYMENTS (-৳)</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px' }}>-৳ {data?.totalPayments || '0'}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>CURRENT STATUS</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px' }}>
                {String(data?.currentStatus || '').startsWith('Due:') ||
                  String(data?.currentStatus || '').startsWith('Advance:') ||
                  String(data?.currentStatus || '').startsWith('Advance Deposit:') ||
                  String(data?.currentStatus || '').startsWith('Paid') ||
                  String(data?.currentStatus || '').includes('৳')
                  ? data?.currentStatus
                  : `Due: ৳ ${data?.currentStatus || '0'}`}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Main Ledger Table */}
      <table className="clean-ledger-table">
        <thead>
          <tr>
            <th style={{ width: '14%' }}>Date</th>
            <th style={{ width: '38%' }}>Particulars / Note</th>
            <th style={{ width: '16%' }} className="text-right">Invoice (+৳)</th>
            <th style={{ width: '16%' }} className="text-right">Payment (-৳)</th>
            <th style={{ width: '16%' }} className="text-right">Running Balance</th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            items.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{item.date}</td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{item.refNo || item.particulars}</div>
                  {item.note && <div style={{ fontSize: '9.5px', color: '#333' }}>{item.note}</div>}
                </td>
                <td className="text-right">{item.invoiceAmount ? `+৳ ${item.invoiceAmount}` : ''}</td>
                <td className="text-right">{item.paymentAmount ? `-৳ ${item.paymentAmount}` : ''}</td>
                <td className="text-right" style={{ fontWeight: 'bold' }}>
                  {item.status || (item.running_balance !== undefined ? (item.running_balance >= 0 ? `Due: ৳ ${item.running_balance}` : `Adv: ৳ ${Math.abs(item.running_balance)}`) : (item.runningBalance !== undefined ? (item.runningBalance >= 0 ? `Due: ৳ ${item.runningBalance}` : `Adv: ৳ ${Math.abs(item.runningBalance)}`) : ''))}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '15px' }}>No transactions found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signatures */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '35px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #000000', paddingTop: '4px', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
              Prepared By
            </td>
            <td style={{ width: '5%', border: 'none' }}></td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #000000', paddingTop: '4px', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
              Checked/Verified By
            </td>
            <td style={{ width: '5%', border: 'none' }}></td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', borderTop: '1px solid #000000', paddingTop: '4px', borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}>
              Customer Signature & Seal
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default LedgerPdfTemplate;
