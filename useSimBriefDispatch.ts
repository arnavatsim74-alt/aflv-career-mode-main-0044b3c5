const { dispatch, getManualUrl } = useSimBriefDispatch('/api/simbrief/');

// Auto-dispatch with one line
await dispatch(leg, '/pirep?leg=123');
```

### 3. **Updated Dispatch Component**
Your existing component now:
- **Auto-fills SimBrief** when user clicks "Dispatch"
- Opens SimBrief popup with **all fields pre-populated**
- Has **fallback to manual URL** if auto-dispatch fails
- Shows "Dispatch (Auto SimBrief)" button label

## 🚀 How It Works

1. **User clicks "Dispatch"** on a leg
2. Database status updates to `'dispatched'`
3. **Auto-dispatch extracts data** from `DispatchLeg`:
   - Origin/Destination airports
   - Aircraft type & tail number
   - Flight number & callsign
   - Auto-calculated flight level & speed
4. **Hidden form is created & submitted** to SimBrief
5. **SimBrief popup opens** with all fields pre-filled
6. User reviews and generates flight plan
7. After completion, redirects to PIREP page

## 📋 File Structure
```
src/
├── lib/
│   └── simbrief/
│       ├── simbrief.apiv1.ts      # Core API module
│       ├── auto-dispatch.ts        # NEW: Auto-fill integration
│       └── simbrief-api.ts         # Backend handlers
└── pages/
    └── Dispatch.tsx                # UPDATED: Uses auto-dispatch
