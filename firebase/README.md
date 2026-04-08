# Firebase Security Rules

This directory contains the Firebase Security Rules for the 3D Interactive Tour application.

## Rules File

**`firebase-rules.json`** - This is the **authoritative** rules file for the Firebase Realtime Database.

### Structure

The rules enforce:
- **Read access**: Public (anyone can view availability data)
- **Write access**: Authenticated users only
- **Status validation**: Must be one of `['available', 'reserved', 'sold', 'unavailable']`
- **Field-level validation**: Type checking for all properties
- **User data**: Users can only read/write their own data (admins can read all)
- **Settings**: Only admins can modify settings
- **Logs**: Admins can read logs, authenticated users can write logs

### Deployment

To deploy these rules to Firebase:

```bash
firebase deploy --only database:rules
```

Or using the Firebase CLI:

```bash
firebase deploy --database-rules firebase-rules.json
```

## Security Notes

1. **API keys are not secrets**: Firebase API keys are included in client-side code by design. Security is enforced through these rules, not through key secrecy.

2. **Authentication required for writes**: Only authenticated users can modify availability data.

3. **Validation**: All status updates are validated to prevent invalid data.

4. **Future improvements**:
   - Implement Firebase App Check for additional security
   - Add rate limiting to prevent abuse
   - Consider implementing Cloud Functions for complex business logic
