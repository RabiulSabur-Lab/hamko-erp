import React from 'react';

export type SupplierLedgerPdfItem = {
  date: string;
  refNo: string;
  particulars: string;
  purchaseAmount: number | string;
  paymentAmount: number | string;
  runningBalance: number | string;
  type?: 'invoice' | 'payment' | 'opening' | 'debit_note';
};

export type SupplierLedgerPdfData = {
  accountHolder?: string;
  accountCode?: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  supplierEmail?: string;
  contactPerson?: string;
  statementDate: string;
  periodFrom?: string;
  periodTo?: string;
  openingBalance: number | string;
  totalPurchases: number | string;
  totalPayments: number | string;
  closingBalance: number | string;
  items: SupplierLedgerPdfItem[];
};

const fmt = (n: number | string): string => {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const SupplierLedgerPdfTemplate = ({ data }: { data: SupplierLedgerPdfData }) => {
  const items = data?.items || [];

  return (
    <div
      id="print-supplier-ledger"
      className="supplier-ledger-pdf-container"
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
          size: A4;
          margin: 12mm !important;
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
            background: #fff !important;
          }

          #root, #__next {
            display: none !important;
            visibility: hidden !important;
          }

          .supplier-ledger-pdf-container {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            position: static !important;
            box-sizing: border-box !important;
          }

          .supplier-ledger-pdf-container,
          .supplier-ledger-pdf-container * {
            visibility: visible !important;
          }

          .brand-header-block,
          .statement-banner-block,
          .supplier-meta-block,
          .summary-cards-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .supplier-ledger-table-wrapper {
            width: 100% !important;
            overflow: visible !important;
            display: block !important;
          }

          table.supplier-ledger-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            display: table !important;
            margin-top: 10px !important;
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          table.supplier-ledger-table thead,
          thead {
            display: table-header-group !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.supplier-ledger-table thead tr,
          table.supplier-ledger-table thead th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.supplier-ledger-table tbody,
          tbody {
            display: table-row-group !important;
          }

          table.supplier-ledger-table tr,
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.supplier-ledger-table th,
          table.supplier-ledger-table td {
            display: table-cell !important;
            border: 1px solid #e5e7eb !important;
            padding: 6px 4px !important;
            font-size: 10px !important;
            line-height: 1.3 !important;
            vertical-align: middle !important;
            position: static !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.supplier-ledger-table thead th {
            background-color: #f8fafc !important;
            font-weight: 700 !important;
            font-size: 10px !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }

          table.supplier-ledger-table th.col-date,
          table.supplier-ledger-table td.col-date {
            width: 12% !important;
            text-align: left !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
          }

          table.supplier-ledger-table th.col-ref,
          table.supplier-ledger-table td.col-ref {
            width: 18% !important;
            text-align: left !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
          }

          table.supplier-ledger-table th.col-particulars,
          table.supplier-ledger-table td.col-particulars {
            width: 32% !important;
            text-align: left !important;
            padding: 6px 4px !important;
            word-wrap: break-word !important;
            word-break: break-word !important;
          }

          table.supplier-ledger-table th.col-purchase,
          table.supplier-ledger-table td.col-purchase {
            width: 13% !important;
            text-align: right !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
          }

          table.supplier-ledger-table th.col-payment,
          table.supplier-ledger-table td.col-payment {
            width: 12% !important;
            text-align: right !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
          }

          table.supplier-ledger-table th.col-balance,
          table.supplier-ledger-table td.col-balance {
            width: 13% !important;
            text-align: right !important;
            padding: 6px 4px !important;
            white-space: nowrap !important;
          }

          table.supplier-ledger-table tr.row-opening td {
            background-color: #f1f5f9 !important;
            font-style: italic !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table.supplier-ledger-table tr.row-payment td {
            background-color: #f0fdf4 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table.supplier-ledger-table tr.row-debit-note td {
            background-color: #fffbeb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table.supplier-ledger-table td.cell-payment-amount {
            color: #16a34a !important;
            font-weight: 700 !important;
          }

          table.supplier-ledger-table td.cell-debit-note-amount {
            color: #b45309 !important;
            font-weight: 700 !important;
          }

          table.supplier-ledger-table td.cell-balance,
          table.supplier-ledger-table th.cell-balance {
            text-align: right !important;
            font-weight: 700 !important;
            background-color: #fefce8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table.supplier-ledger-table tr.row-total {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          table.supplier-ledger-table tr.row-total td {
            border-top: 2px solid #0f172a !important;
            font-weight: 700 !important;
            font-size: 11px !important;
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          table.supplier-ledger-table td.cell-purchase-amount {
            color: #1d4ed8 !important;
            font-weight: 600 !important;
          }

          /* Prevent wrapping in numeric / date cells */
          table.supplier-ledger-table td.cell-date,
          table.supplier-ledger-table td.cell-purchase-amount,
          table.supplier-ledger-table td.cell-payment-amount,
          table.supplier-ledger-table td.cell-balance {
            white-space: nowrap !important;
          }

          .signature-section {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 35px !important;
            width: 100% !important;
          }

          .signature-section tr,
          .signature-section td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Brand Header */}
      <table className="brand-header-block" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ width: '22%', verticalAlign: 'middle', border: 'none', padding: 0 }}>
              <img
                src="/logo.png"
                alt="HAMKO"
                style={{ maxHeight: '42px', maxWidth: '120px', width: 'auto', display: 'block' }}
                onError={(e: any) => { e.currentTarget.src = '/Hamko.png'; }}
              />
            </td>
            <td style={{ width: '56%', textAlign: 'center', verticalAlign: 'middle', border: 'none', padding: 0 }}>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#000000' }}>
                HAMKO INDUSTRIES LTD.
              </h1>
              <p style={{ fontSize: '11.5px', margin: '2px 0 0 0', color: '#000000' }}>Procurement / Payable Accounts</p>
            </td>
            <td style={{ width: '22%', border: 'none', padding: 0 }}></td>
          </tr>
        </tbody>
      </table>

      {/* Divider */}
      <div style={{ borderBottom: '2.5px solid #000000', margin: '8px 0 12px 0', width: '100%' }}></div>

      {/* Statement Banner */}
      <div className="statement-banner-block" style={{
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
        WebkitPrintColorAdjust: 'exact' as any,
        printColorAdjust: 'exact' as any,
      }}>
        <span style={{ color: '#0f172a', fontWeight: 900 }}>
          SUPPLIER PROCUREMENT LEDGER STATEMENT
        </span>
      </div>

      {/* Supplier Metadata Box */}
      <div className="supplier-meta-block" style={{
        border: '1px solid #0f172a',
        backgroundColor: '#ffffff',
        borderRadius: '2px',
        padding: '10px 14px',
        marginBottom: '14px',
        WebkitPrintColorAdjust: 'exact' as any,
        printColorAdjust: 'exact' as any,
      }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <tbody>
            <tr>
              {/* Left Block: Account Holder / Buyer */}
              <td style={{ width: '50%', verticalAlign: 'top', borderRight: '2px solid #1e293b', paddingRight: '16px', borderBottom: 'none', borderLeft: 'none', borderTop: 'none', color: '#000000' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Account Holder:</strong>{' '}
                        <span style={{ fontWeight: 700 }}>{data?.accountHolder || 'M/S Swarna Enterprise'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Dealer / Account Code:</strong>{' '}
                        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{data?.accountCode || 'HD/OD: 75078'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Statement Date:</strong>{' '}
                        <span style={{ fontWeight: 700 }}>{data?.statementDate || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Period:</strong>{' '}
                        <span>
                          {data?.periodFrom || 'All time'} {data?.periodTo ? `\u2192 ${data.periodTo}` : ''}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right Block: Supplier / Vendor */}
              <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '16px', border: 'none', color: '#000000' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Supplier / Vendor:</strong>{' '}
                        <span style={{ fontWeight: 700 }}>{data?.supplierName || '—'}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Phone:</strong> {data?.supplierPhone || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        <strong>Address:</strong> {data?.supplierAddress || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '3px 0', verticalAlign: 'top', color: '#000000', border: 'none' }}>
                        {(data?.contactPerson || data?.supplierEmail) ? (
                          <div>
                            {data?.contactPerson && <div><strong>Contact Person:</strong> {data.contactPerson}</div>}
                            {data?.supplierEmail && <div style={{ marginTop: '2px' }}><strong>Email:</strong> {data.supplierEmail}</div>}
                          </div>
                        ) : (
                          <div style={{ color: '#64748b' }}>—</div>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Stat Cards */}
      <table className="summary-cards-block" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px 0', marginBottom: '14px', color: '#000000', tableLayout: 'fixed' }}>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>OPENING PAYABLE</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px' }}>৳ {fmt(data?.openingBalance || 0)}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>TOTAL PURCHASES (+৳)</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px', color: '#1d4ed8' }}>+৳ {fmt(data?.totalPurchases || 0)}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>TOTAL PAYMENTS (-৳)</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px', color: '#16a34a' }}>-৳ {fmt(data?.totalPayments || 0)}</div>
            </td>
            <td style={{ border: '1px solid #000000', padding: '6px', textAlign: 'center', fontSize: '9.5px', width: '25%' }}>
              <div>CURRENT PAYABLE</div>
              <div style={{ fontSize: '11.5px', fontWeight: 'bold', marginTop: '3px', color: '#b45309' }}>৳ {fmt(data?.closingBalance || 0)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Main Accounting Ledger Table */}
      <div className="supplier-ledger-table-wrapper" style={{ width: '100%' }}>
      <table
        className="supplier-ledger-table"
        style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}
      >
        <thead>
          <tr>
            {/* Date: 12% */}
            <th
              className="col-date"
              style={{
                width: '12%',
                textAlign: 'left',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
              }}
            >
              Date
            </th>
            {/* Ref / Voucher No: 18% */}
            <th
              className="col-ref"
              style={{
                width: '18%',
                textAlign: 'left',
                padding: '6px 4px',
                whiteSpace: 'nowrap',
                fontSize: '10px',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
              }}
            >
              Ref / Voucher No
            </th>
            {/* Particulars: 32% */}
            <th
              className="col-particulars"
              style={{
                width: '32%',
                textAlign: 'left',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
              }}
            >
              Particulars
            </th>
            {/* Purchase (+৳): 13% */}
            <th
              className="col-purchase"
              style={{
                width: '13%',
                textAlign: 'right',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
              }}
            >
              Purchase (+৳)
            </th>
            {/* Payment (-৳): 12% */}
            <th
              className="col-payment"
              style={{
                width: '12%',
                textAlign: 'right',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
              }}
            >
              Payment (-৳)
            </th>
            {/* Balance (৳): 13% */}
            <th
              className="cell-balance col-balance"
              style={{
                width: '13%',
                textAlign: 'right',
                padding: '6px 4px',
                fontSize: '10px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fefce8',
                color: '#0f172a',
                lineHeight: '1.3',
                boxSizing: 'border-box',
                WebkitPrintColorAdjust: 'exact' as any,
                printColorAdjust: 'exact' as any,
              }}
            >
              Balance (৳)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length > 0 ? (
            <>
              {items.map((item, idx) => {
                const isPayment = item.type === 'payment';
                const isOpening = item.type === 'opening';
                const isDebitNote = item.type === 'debit_note';
                const rowClass = isDebitNote ? 'row-debit-note' : isPayment ? 'row-payment' : isOpening ? 'row-opening' : '';
                const rowBg = isDebitNote ? '#fffbeb' : isPayment ? '#f0fdf4' : isOpening ? '#f1f5f9' : '#ffffff';
                const hasPurchase = item.purchaseAmount && Number(item.purchaseAmount) !== 0;
                const hasPayment = item.paymentAmount && Number(item.paymentAmount) !== 0;

                return (
                  <tr key={idx} className={rowClass} style={{ backgroundColor: rowBg, WebkitPrintColorAdjust: 'exact' as any, printColorAdjust: 'exact' as any }}>
                    <td className="cell-date col-date" style={{ width: '12%', textAlign: 'left', padding: '6px 4px', border: '1px solid #e5e7eb', fontSize: '10px', fontFamily: 'monospace', whiteSpace: 'nowrap', boxSizing: 'border-box' }}>
                      {item.date}
                    </td>
                    <td className="col-ref" style={{ width: '18%', textAlign: 'left', padding: '6px 4px', whiteSpace: 'nowrap', border: '1px solid #e5e7eb', fontSize: '10px', boxSizing: 'border-box' }}>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '10px', whiteSpace: 'nowrap', color: isDebitNote ? '#b45309' : '#0f172a' }}>
                        {item.refNo}
                      </div>
                    </td>
                    <td className="col-particulars" style={{ width: '32%', textAlign: 'left', padding: '6px 4px', wordWrap: 'break-word', border: '1px solid #e5e7eb', fontSize: '10px', fontStyle: isOpening ? 'italic' : 'normal', color: isOpening ? '#475569' : '#000000', boxSizing: 'border-box' }}>
                      {item.particulars}
                    </td>
                    <td className={`col-purchase ${!isPayment && !isDebitNote && hasPurchase ? 'cell-purchase-amount' : ''}`} style={{
                      width: '13%',
                      textAlign: 'right',
                      padding: '6px 4px',
                      whiteSpace: 'nowrap',
                      border: '1px solid #e5e7eb',
                      fontSize: '10.5px',
                      fontWeight: hasPurchase && !isPayment && !isDebitNote ? 600 : 400,
                      color: hasPurchase && !isPayment && !isDebitNote ? '#1d4ed8' : '#9ca3af',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}>
                      {hasPurchase && !isPayment && !isDebitNote ? fmt(item.purchaseAmount) : '—'}
                    </td>
                    <td className={`col-payment ${hasPayment && (isPayment || isDebitNote) ? (isDebitNote ? 'cell-debit-note-amount' : 'cell-payment-amount') : ''}`} style={{
                      width: '12%',
                      textAlign: 'right',
                      padding: '6px 4px',
                      whiteSpace: 'nowrap',
                      border: '1px solid #e5e7eb',
                      fontSize: '10.5px',
                      fontWeight: hasPayment && (isPayment || isDebitNote) ? 700 : 400,
                      color: isDebitNote ? '#b45309' : hasPayment && isPayment ? '#16a34a' : '#9ca3af',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                    }}>
                      {hasPayment && (isPayment || isDebitNote) ? fmt(item.paymentAmount) : '—'}
                    </td>
                    <td className="cell-balance col-balance" style={{
                      width: '13%',
                      textAlign: 'right',
                      padding: '6px 4px',
                      whiteSpace: 'nowrap',
                      border: '1px solid #e5e7eb',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      backgroundColor: '#fefce8',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box',
                      WebkitPrintColorAdjust: 'exact' as any,
                      printColorAdjust: 'exact' as any,
                    }}>
                      {fmt(item.runningBalance)}
                    </td>
                  </tr>
                );
              })}

              {/* Totals Summary Row */}
              <tr className="row-total" style={{ backgroundColor: '#f8fafc', WebkitPrintColorAdjust: 'exact' as any, printColorAdjust: 'exact' as any }}>
                <td colSpan={3} style={{ width: '62%', textAlign: 'left', padding: '6px 4px', border: '1px solid #cbd5e1', borderTop: '2px solid #0f172a', fontWeight: 700, fontSize: '11px', color: '#0f172a', boxSizing: 'border-box' }}>
                  TOTALS
                </td>
                <td className="col-purchase" style={{ width: '13%', textAlign: 'right', padding: '6px 4px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1', borderTop: '2px solid #0f172a', fontWeight: 700, fontSize: '11px', color: '#1d4ed8', fontFamily: 'monospace', boxSizing: 'border-box' }}>
                  {fmt(data?.totalPurchases || 0)}
                </td>
                <td className="col-payment" style={{ width: '12%', textAlign: 'right', padding: '6px 4px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1', borderTop: '2px solid #0f172a', fontWeight: 700, fontSize: '11px', color: '#16a34a', fontFamily: 'monospace', boxSizing: 'border-box' }}>
                  {fmt(data?.totalPayments || 0)}
                </td>
                <td className="cell-balance col-balance" style={{ width: '13%', textAlign: 'right', padding: '6px 4px', whiteSpace: 'nowrap', border: '1px solid #cbd5e1', borderTop: '2px solid #0f172a', fontWeight: 700, fontSize: '11px', color: '#b45309', backgroundColor: '#fefce8', fontFamily: 'monospace', boxSizing: 'border-box', WebkitPrintColorAdjust: 'exact' as any, printColorAdjust: 'exact' as any }}>
                  {fmt(data?.closingBalance || 0)}
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: '20px', fontSize: '11px', color: '#6b7280' }}>
                No transactions found for this supplier.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Signatures */}
      <table className="signature-section" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '40px', pageBreakInside: 'avoid', breakInside: 'avoid' } as any}>
        <tbody>
          <tr>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', verticalAlign: 'top', border: 'none' }}>
              <div style={{ borderTop: '1px solid #0f172a', width: '100%', marginBottom: '6px' }} />
              <strong>Prepared By</strong>
            </td>
            <td style={{ width: '5%', border: 'none' }}></td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', verticalAlign: 'top', border: 'none' }}>
              <div style={{ borderTop: '1px solid #0f172a', width: '100%', marginBottom: '6px' }} />
              <strong>Accounts / Finance</strong>
            </td>
            <td style={{ width: '5%', border: 'none' }}></td>
            <td style={{ width: '30%', textAlign: 'center', fontSize: '10px', verticalAlign: 'top', border: 'none' }}>
              <div style={{ borderTop: '1px solid #0f172a', width: '100%', marginBottom: '6px' }} />
              <strong>Authorized Signatory</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SupplierLedgerPdfTemplate;
