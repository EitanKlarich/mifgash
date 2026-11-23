import React, { useEffect } from 'react';
import { X, ShieldCheck, FileText } from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms';

interface LegalModalProps {
  docType: LegalDocType;
  onChangeDocType?: (next: LegalDocType) => void;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  docType,
  onChangeDocType,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-[#0A0E17]/85 backdrop-blur-xs flex items-center justify-center safe-modal-container sm:p-4 z-50 animate-in fade-in duration-100"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={docType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
    >
      <div
        className="bg-[#121724] border border-[#1F283C] rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[86vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1F283C] shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8E84E4]/15 text-[#8E84E4] flex items-center justify-center shrink-0">
              {docType === 'privacy' ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F1F3F7]">
                {docType === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </h3>
              <p className="text-[11px] text-[#8D98AF]">Effective November 22, 2026 · Mifgash</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#8D98AF] hover:text-[#F1F3F7] p-1.5 rounded-lg hover:bg-[#182033] transition-colors cursor-pointer"
            aria-label="Close legal document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Doc Switcher */}
        {onChangeDocType && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => onChangeDocType('privacy')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                docType === 'privacy'
                  ? 'bg-[#8E84E4]/15 text-[#8E84E4] border-[#8E84E4]/40'
                  : 'bg-[#182033] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7]'
              }`}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onChangeDocType('terms')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                docType === 'terms'
                  ? 'bg-[#8E84E4]/15 text-[#8E84E4] border-[#8E84E4]/40'
                  : 'bg-[#182033] text-[#8D98AF] border-[#1F283C] hover:text-[#F1F3F7]'
              }`}
            >
              Terms of Service
            </button>
          </div>
        )}

        {/* Scrollable Legal Text */}
        <div className="flex-1 overflow-y-auto text-xs text-[#CBD2E1] space-y-3.5 leading-relaxed pr-1">
          {docType === 'privacy' ? (
            <>
              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">1. Information We Collect</h4>
                <p className="text-[#8D98AF]">
                  When you create an account on Mifgash using Email/Password, Google Sign-In, or Sign in with Apple, we collect your name, email address (including Apple private relay emails when selected), and optional profile photo. We also store the groups, plans, RSVPs, polls, comments, and feedback you choose to create inside the app.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">2. How Your Data Is Used &amp; Stored</h4>
                <p className="text-[#8D98AF]">
                  Your account credentials and application data are stored securely using Google Firebase Authentication and Cloud Firestore. Your private groups and plans are accessible only to authenticated members of those groups. We never sell your personal information or track you across third-party apps or websites for advertising.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">3. AI &amp; Automated Processing Disclosure</h4>
                <p className="text-[#8D98AF]">
                  Mifgash does <strong className="text-[#F1F3F7]">not</strong> send your messages, plans, polls, profile information, or personal content to generative AI models or third-party AI training services. If optional AI-assisted planning features are introduced in the future, Mifgash will clearly disclose what data is sent, identify the processing provider, and request your explicit consent before any content is processed by AI services.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">4. Location Search, Weather &amp; Calendars</h4>
                <p className="text-[#8D98AF]">
                  When you type a venue address or view a weather forecast for a scheduled plan, only the location query or event coordinates and date are sent to OpenStreetMap (Photon/Nominatim) and Open-Meteo to fetch venue suggestions and forecasts. When you export an event to Google Calendar, Apple Calendar, or an .ics file, only that event&apos;s title, time, description, and location are shared with your chosen calendar app.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">5. Account Deletion &amp; Data Rights</h4>
                <p className="text-[#8D98AF]">
                  You may permanently delete your account at any time inside the app under <strong className="text-[#F1F3F7]">Profile → Delete Account</strong>. Confirming deletion removes your profile record, notifications, group memberships, sole-owned groups/plans/polls, and your Firebase Authentication account.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">6. Contact</h4>
                <p className="text-[#8D98AF]">
                  For privacy questions or data requests, reach us anytime via <strong className="text-[#F1F3F7]">Profile → Help &amp; Feedback</strong> or at <span className="text-[#F1F3F7]">support@mifgash.app</span>.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">1. Acceptance of Terms</h4>
                <p className="text-[#8D98AF]">
                  By creating an account or using Mifgash, you agree to these Terms of Service and our Privacy Policy. Mifgash provides group scheduling, event RSVPs, and polling tools for personal, social, community, and team coordination.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">2. Accounts &amp; Security</h4>
                <p className="text-[#8D98AF]">
                  You are responsible for maintaining the security of your login credentials (Email, Google, or Apple account) and for all activity conducted under your account. Provide accurate information and notify us if you suspect unauthorized access.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">3. Acceptable Conduct &amp; User Content</h4>
                <p className="text-[#8D98AF]">
                  You retain ownership of the plans, polls, comments, and images you share in your groups. You agree not to upload unlawful, harassing, abusive, spam, or infringing content, and not to attempt to bypass group invitations or access controls.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">4. Third-Party Services</h4>
                <p className="text-[#8D98AF]">
                  Authentication, cloud storage, mapping/geocoding, weather forecasts, and calendar exports rely on third-party providers (including Google Firebase, Apple, OpenStreetMap, and Open-Meteo). Your use of external calendar apps or sign-in providers is also subject to their respective terms.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">5. Account Termination &amp; Deletion</h4>
                <p className="text-[#8D98AF]">
                  You may stop using Mifgash and delete your account permanently at any time from your Profile settings. We may suspend accounts that violate these Terms or threaten platform security.
                </p>
              </section>

              <section className="space-y-1">
                <h4 className="text-xs font-semibold text-[#F1F3F7]">6. Availability &amp; Disclaimers</h4>
                <p className="text-[#8D98AF]">
                  Mifgash is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; While we work to keep schedules and notifications reliable, we are not liable for missed events, third-party service outages, or indirect damages.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#1F283C] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#8E84E4] hover:bg-[#7B71D3] text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
