# TrackPay FAQ Library (English Draft)

Use this document as the source of truth for Help screen content. Questions are grouped by persona and category so they can be rendered in sections. Spanish translations will be produced later; keep these English strings in `simpleT` until localization is added.

---

## Provider FAQs

### Sessions
1. **How do I start a new session?**  
   Open the client from your list, review the details, then tap **“I’m Here”**. The timer begins immediately and you can monitor elapsed time at the top of the screen.

2. **How do I end a running session?**  
   From the active session screen, tap **“I’m Done”** when the visit ends. TrackPay calculates duration, person hours, and the amount due automatically.

3. **Can I adjust the crew size during a session?**  
   Yes. Use the crew size stepper while the session is active. Changes apply to the entire session and the payment summary updates as soon as you confirm.

4. **How do I change a client’s hourly rate?**  
   Go to the client profile, tap **Edit**, update the hourly rate field, and save. New sessions will use the updated rate immediately.

5. **What if a session ended but the duration looks wrong?**  
   Pause new work, review the session history, and contact support with the session ID so we can help correct the entry.

### Invites
1. **How do I invite a client to TrackPay?**  
   On the client list, tap **Invite**, generate a code, and share it via text or email. The client enters that code during sign-up to link to you.

2. **How do I invite another provider to help with my clients?**  
   Use the provider invite flow in Settings to generate a provider code. Share it directly with the provider you trust so they can join your workspace.

3. **What happens if a client never accepts my invite?**  
   You can resend the invite from the client profile. If the link expires, create a fresh code and share it again, or remove the placeholder client if no longer needed.

4. **Can I revoke an invite that went to the wrong person?**  
   Yes. Open the invite record, choose **Revoke**, and the code stops working immediately. Create a new invite for the correct contact when ready.

### Payments
1. **How do I request payment for recent sessions?**  
   From the client history, select unpaid sessions and tap **Request Payment**. TrackPay notifies the client and tracks the outstanding balance.

2. **How do I mark a payment as received?**  
   Open the payment request or unpaid session list, choose the sessions that were paid, and tap **Mark as Paid**. Enter the amount and payment method, then confirm.

3. **What if a payment amount looks incorrect?**  
   Review the session details for crew size and duration. If something still feels off, email support with the session IDs and we’ll help reconcile the numbers.

4. **Can I see which clients still owe me money?**  
   Yes. The client list shows outstanding balances at a glance, and the analytics summary breaks down unpaid, requested, and paid totals.

### General
1. **How do I share TrackPay with other providers?**  
   Tap the hamburger menu, choose **Share**, and use the pre-filled message to text or email colleagues about TrackPay.

2. **How can I contact TrackPay support?**  
   Open the hamburger menu, tap **Contact**, and hit **Email Support**. The message automatically includes your app version so we can help faster.

3. **Where can I see all my recent activity?**  
   Visit the Activity Feed to view session starts, ends, payment requests, and payment confirmations in chronological order.

4. **What should I do if something looks inaccurate?**  
   Pause before adjusting data manually, take screenshots if possible, and email support with a short description and session IDs so we can investigate.

---

## Client FAQs

### Sessions
1. **How do I know when my provider is on-site?**  
   You’ll see a live session banner in the provider list once they tap **“I’m Here.”** The Activity Feed also logs the start time.

2. **Can I view the details of past sessions?**  
   Yes. Open the provider, then tap **Session History** to see dates, durations, crew sizes, and notes for every visit.

3. **How do I request corrections to a session?**  
   If something looks wrong, contact your provider directly or use the **Contact** option in the menu to email TrackPay support with the session details.

### Invites
1. **How do I accept a provider’s invite?**  
   During sign-up, enter the invite code your provider shared. TrackPay links your account instantly so you can view their sessions and requests.

2. **What if I never received an invite code?**  
   Ask your provider to resend the code or send you a new one. If you still don’t receive it, contact support and we’ll verify the provider-client connection.

3. **Can I invite another provider to TrackPay?**  
   Yes. Use the **Invite Provider** option to send them a code. Once they join, you can see their sessions alongside your other providers.

4. **How do I invite another family member to help manage care?**  
   Share your login credentials sparingly or contact support to set up access for a family coordinator (multi-user support is on the roadmap).

### Payments
1. **How do I review payment requests from my provider?**  
   Open the provider list, tap the provider with a badge, and review unpaid sessions grouped by request. Each entry shows hours and amounts due.

2. **How do I mark a payment as completed?**  
   Select the request, tap **Mark as Paid**, choose the method (cash, Zelle, etc.), and confirm. TrackPay updates the provider instantly.

3. **Can I pay only part of the amount now?**  
   Partial payments aren’t supported yet. Contact your provider to coordinate adjustments and have them reissue a request once ready.

4. **What if the amount looks higher than expected?**  
   Review the session list for crew size or extended time. If it still seems incorrect, reach out to the provider or email TrackPay support with the request ID.

### General
1. **How do I contact TrackPay for help?**  
   Tap the hamburger menu, choose **Contact**, and select **Email Support**. A draft opens with your app version included automatically.

2. **How can I share TrackPay with other families?**  
   Use the **Share** option in the hamburger menu to send a pre-written message with the TrackPay link.

3. **Where do I find app updates or new features?**  
   Check the Activity Feed announcements section or read our release notes linked from the Contact screen footer.

4. **How do I switch between multiple providers?**  
   The provider list shows all active providers. Tap any card to dive into their sessions, payments, and activity history.

5. **What should I do if my provider stops appearing in the list?**  
   Refresh the screen to pull the latest data. If they still don’t show up, contact the provider or email support so we can confirm the relationship status.

---

**Implementation Note:** Convert these Q&A entries into a typed data structure (e.g., `faqLibrary.ts`) with persona and category tags so the Help screen can render sections dynamically.
