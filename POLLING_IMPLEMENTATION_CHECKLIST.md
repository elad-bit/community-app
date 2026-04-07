# Polling System Implementation Checklist

## Pre-Deployment Setup

### 1. Database Migration
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Copy entire contents of `supabase/migrations/add_polls.sql`
- [ ] Execute the SQL
- [ ] Verify no errors in execution

### 2. Environment Variables
- [ ] Confirm NEXT_PUBLIC_SUPABASE_URL in `.env.local`
- [ ] Confirm NEXT_PUBLIC_SUPABASE_ANON_KEY in `.env.local`
- [ ] Confirm SUPABASE_SERVICE_ROLE_KEY in `.env.local`

### 3. Dependencies Check
- [ ] Verify clsx is installed (should be)
- [ ] Verify next is version 14+
- [ ] Run `npm install` to update any missing packages

## File Structure Verification

### Backend Files
- [ ] `/app/api/polls/route.ts` exists and is complete
- [ ] `/app/api/polls/[id]/route.ts` exists and is complete
- [ ] `/app/api/polls/[id]/vote/route.ts` exists and is complete

### Frontend Files
- [ ] `/app/dashboard/polls/page.tsx` exists
- [ ] `/components/polls/PollsClient.tsx` exists
- [ ] `/types/index.ts` contains Poll types

### Navigation Updates
- [ ] `components/layout/Sidebar.tsx` has polls link
- [ ] `components/layout/MobileNav.tsx` has polls link

### Documentation
- [ ] `POLLS_SYSTEM.md` exists
- [ ] `POLLING_IMPLEMENTATION_CHECKLIST.md` exists (this file)

## Testing Checklist

### As Admin User

#### Create Poll
- [ ] Navigate to `/dashboard/polls`
- [ ] Click "+ הצבעה חדשה"
- [ ] Fill in title: "בדיקה הצבעה"
- [ ] Select type: "אסיפה כללית"
- [ ] Select category: "כללי"
- [ ] Add 3 options: "אפשרות 1", "אפשרות 2", "אפשרות 3"
- [ ] Leave anonymous unchecked
- [ ] Click "יצור הצבעה"
- [ ] Verify success toast and poll appears in draft status

#### Open Poll
- [ ] Click "פתח" on the draft poll
- [ ] Verify status changes to "פתוח"
- [ ] Verify success toast

#### Delete Draft Poll
- [ ] Create another draft poll
- [ ] Click "מחק"
- [ ] Confirm deletion
- [ ] Verify poll is removed

#### Close Poll
- [ ] Click "סגור" on open poll
- [ ] Verify status changes to "סגור"

### As Regular Member

#### Vote in Poll
- [ ] Switch to non-admin user
- [ ] Navigate to `/dashboard/polls`
- [ ] See open poll
- [ ] Click on the poll card
- [ ] See "הצבע" button (if poll is open and haven't voted)
- [ ] Click "הצבע"
- [ ] Vote modal opens
- [ ] Select an option via radio button
- [ ] Click "הצבע"
- [ ] Verify success toast
- [ ] Page refreshes or poll updates

#### View Results
- [ ] Click "תוצאות" on a closed or voted poll
- [ ] Results modal opens
- [ ] See all options with vote counts and percentages
- [ ] See visual progress bars
- [ ] Verify vote counts are correct

#### Cannot Vote Twice
- [ ] Try to vote again in same poll
- [ ] Verify error toast: "כבר הצבעת בהצבעה זו"
- [ ] Verify no vote is recorded

### Committee Polls

#### Create Committee Poll
- [ ] As admin, create poll with type: "הצבעות ועד"
- [ ] Open the poll
- [ ] Verify success

#### Non-Admin Cannot Vote
- [ ] As regular member, try to vote in committee poll
- [ ] Verify error toast: "הצבעה זו מיועדת לחברי ועד בלבד"

#### Admin Can Vote
- [ ] As admin, vote in committee poll
- [ ] Verify vote is recorded

### Anonymous Voting

#### Create Anonymous Poll
- [ ] As admin, create poll and check "הצבעה אנונימית"
- [ ] Open poll
- [ ] Vote as member
- [ ] Verify vote is recorded

#### Non-Anonymous Shows Voters (Admin)
- [ ] Create non-anonymous poll
- [ ] Vote as member
- [ ] As admin, view poll results
- [ ] Click "תוצאות"
- [ ] Verify voter name appears (for non-anonymous)
- [ ] Verify voters list does NOT appear (for anonymous)

### UI/UX

#### Tabs and Filtering
- [ ] See tabs for "אסיפה כללית" and "הצבעות ועד"
- [ ] Click each tab and verify polls filter
- [ ] See sub-tabs for status filtering
- [ ] Verify filtering works correctly

#### Responsive Design
- [ ] Test on desktop (sidebar visible)
- [ ] Test on mobile (mobile nav visible)
- [ ] Verify modals are centered and readable
- [ ] Verify no horizontal scroll

#### Hebrew RTL
- [ ] Verify all text is right-aligned
- [ ] Verify modal arrows point correctly
- [ ] Verify buttons align correctly
- [ ] Check mobile nav at bottom

#### Styling
- [ ] Verify category badges have correct colors
- [ ] Verify status badges have correct colors
- [ ] Verify buttons have correct colors
- [ ] Verify progress bars in results

### Error Handling

#### Missing Data
- [ ] Try to create poll with no title (should fail)
- [ ] Try to create poll with only 1 option (should fail)
- [ ] Verify error toasts appear

#### Double-Vote
- [ ] Vote once (success)
- [ ] Vote twice (should fail with 409)

#### Permission Errors
- [ ] As member, try to delete poll (should fail)
- [ ] As member, try to open poll (should fail)

#### Network
- [ ] Test with network throttling in dev tools
- [ ] Verify loading states appear
- [ ] Verify error messages on network failure

## Post-Deployment

### Performance
- [ ] Check Network tab - API calls under 1s
- [ ] Check Console - no errors or warnings
- [ ] Check that animations are smooth

### Analytics
- [ ] Consider adding event tracking for:
  - Poll created
  - Poll opened
  - Vote cast
  - Poll closed

### Future Enhancements
- [ ] Add poll scheduling (starts_at, ends_at)
- [ ] Add multiple choice questions
- [ ] Add weighted voting
- [ ] Add voter export (CSV for admins)
- [ ] Add real-time updates via WebSocket
- [ ] Add poll templates

## Rollback Plan

If issues arise:

1. **Database Issues**
   - Go to Supabase Dashboard
   - SQL Editor
   - Run: `DROP TABLE poll_participants; DROP TABLE poll_votes; DROP TABLE poll_options; DROP TABLE polls;`
   - Run the migration again

2. **Code Issues**
   - Revert the following files:
     - `app/api/polls/*`
     - `app/dashboard/polls/page.tsx`
     - `components/polls/PollsClient.tsx`
     - `types/index.ts` (restore Poll types)
     - `components/layout/Sidebar.tsx` (remove polls link)
     - `components/layout/MobileNav.tsx` (remove polls link)

3. **Full Rollback**
   - Remove all polling-related files
   - Restore database schema without polls tables
   - Restart Next.js dev server

## Support

For issues, check:
1. `POLLS_SYSTEM.md` for detailed documentation
2. Supabase console for database errors
3. Browser console for JavaScript errors
4. Network tab for API errors

All error messages are in Hebrew. Refer to error message list in POLLS_SYSTEM.md.
