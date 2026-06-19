import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Printer, Download, X } from 'lucide-react';
import api from '../../services/api';
import Loader from '../common/Loader';
import Button from '../common/Button';
import { getErrorMessage } from '../../utils/getErrorMessage';

function fmtDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

// Full-screen overlay showing a printable invoice for a booking.
function InvoiceModal({ bookingId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/bookings/${bookingId}/invoice`);
        if (active) setInvoice(data.invoice);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Could not load invoice'));
        if (active) onClose();
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [bookingId, onClose]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/bookings/${bookingId}/invoice/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'application/pdf' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not download invoice'));
    } finally {
      setDownloading(false);
    }
  };

  const pb = invoice?.priceBreakdown;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header no-print">
          <h3 className="modal-title">Invoice</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading || !invoice ? (
            <Loader message="Loading invoice..." />
          ) : (
            <div id="invoice-printable" className="invoice-sheet">
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: 700,
                      color: 'var(--brand-primary)',
                    }}
                  >
                    {invoice.company.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {invoice.company.address}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {invoice.company.email} · {invoice.company.phone}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>INVOICE</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {invoice.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Issued: {fmtDate(invoice.issueDate)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Due: {fmtDate(invoice.dueDate)}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Ref: {invoice.bookingRef}
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Bill To
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {invoice.customer.name}
                  <br />
                  {invoice.customer.email}
                  <br />
                  {invoice.customer.phone}
                  {invoice.customer.address ? (
                    <>
                      <br />
                      {invoice.customer.address}
                    </>
                  ) : null}
                </div>
              </div>

              {/* Equipment + period */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  Rental Details
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {invoice.equipment.name} ({invoice.equipment.category})
                  <br />
                  {fmtDate(invoice.rentalPeriod.startDate)} -{' '}
                  {fmtDate(invoice.rentalPeriod.endDate)} (
                  {invoice.rentalPeriod.days} day
                  {invoice.rentalPeriod.days === 1 ? '' : 's'})
                </div>
              </div>

              {/* Price breakdown */}
              <div className="rental-summary" style={{ background: 'transparent', padding: 0 }}>
                <div className="summary-row">
                  <span>
                    Rental ({money(pb.dailyRate)} x {pb.days} day
                    {pb.days === 1 ? '' : 's'})
                  </span>
                  <span>{money(pb.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Service fee</span>
                  <span>{money(pb.serviceFee)}</span>
                </div>
                <div className="summary-row">
                  <span>Deposit (refundable)</span>
                  <span>{money(pb.deposit)}</span>
                </div>
                {pb.lateFee > 0 && (
                  <div className="summary-row" style={{ color: 'var(--accent-error)' }}>
                    <span>Late fee</span>
                    <span>{money(pb.lateFee)}</span>
                  </div>
                )}
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{money(invoice.total)}</span>
                </div>
              </div>

              {/* Payment info */}
              <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Payment: <span style={{ textTransform: 'capitalize' }}>{invoice.payment.status}</span>
                {invoice.payment.method ? ` (${invoice.payment.method})` : ''}
                {invoice.payment.transactionId ? (
                  <>
                    <br />
                    Transaction: {invoice.payment.transactionId}
                  </>
                ) : null}
              </div>

              {/* Footer */}
              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-light)',
                  fontSize: '11px',
                  color: 'var(--text-tertiary)',
                  textAlign: 'center',
                }}
              >
                Thank you for renting with {invoice.company.name}. The deposit is
                refundable upon return of the equipment in good condition. For
                questions, contact {invoice.company.email}.
              </div>
            </div>
          )}
        </div>

        {!loading && invoice && (
          <div className="modal-footer no-print">
            <Button variant="secondary" onClick={handlePrint}>
              <Printer size={16} /> Print
            </Button>
            <Button variant="primary" onClick={handleDownload} disabled={downloading}>
              <Download size={16} /> {downloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default InvoiceModal;
