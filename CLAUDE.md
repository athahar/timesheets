# Timesheet App Development Guidelines

## Project Overview
A two-sided time tracking and payment request app built with Expo (React Native), featuring service provider and client views with real-time activity feeds. Uses AsyncStorage for persistence with plans to migrate to Supabase.

## Development Best Practices

### CRITICAL: Test Before Declaring Ready
- **NEVER** claim a feature works without actually testing it visually
- **ALWAYS** take screenshots and compare against design requirements
- **VERIFY** that styles are actually rendering, not just code compiling
- **TEST** the app in the browser before saying it's complete

### Testing Strategy
- **Visual Testing**: Compare screenshots against mockups/designs
- **Functional Testing**: Test time tracking, payments, navigation flows
- **Cross-Platform Testing**: Verify on both web (Expo Web) and mobile (Expo Go)
- **Data Persistence**: Test AsyncStorage functionality across sessions
- **Edge Cases**: Test with no data, error states, partial payments

### Styling Approach Consistency
- **Choose ONE**: Either use nativewind/Tailwind OR React Native StyleSheet
- **NO MIXING**: Don't mix className and style props in same project
- **Theme System**: Use consistent colors, spacing, typography
- **Test Styles**: Verify styles actually render in browser, not just compile

### Commit Guidelines
- **Descriptive Messages**: Explain what actually changed and why
- **Visual Changes**: Include before/after screenshots when relevant
- **Test Results**: Note if feature was actually tested
- **Conventional Format**: `type(scope): description`
  - `feat`: New features
  - `fix`: Bug fixes
  - `style`: Visual/styling changes
  - `refactor`: Code restructuring
  - `test`: Adding tests
  - `docs`: Documentation
- **Example**: `feat(session-tracking): implement Apple-style cards with shadows - tested visually`

### Code Quality Standards
- **TypeScript**: Strict types, proper interfaces
- **Error Handling**: Graceful error states and user feedback
- **Performance**: Efficient state management and re-renders
- **Accessibility**: Proper touch targets and labels
- **Consistency**: Follow existing patterns in codebase

### Architecture Patterns
- **Follow Existing**: Study current components before creating new ones
- **AsyncStorage**: Use established storage service patterns
- **Navigation**: Follow React Navigation patterns
- **State Management**: Use React hooks consistently
- **File Organization**: Maintain `/src` folder structure

### Development Workflow
1. **Understand Requirements**: Study mockups and specifications
2. **Check Existing Code**: See how similar features are implemented
3. **Choose Styling Approach**: Use consistent method throughout
4. **Implement Incrementally**: Build and test small pieces
5. **Visual Verification**: Take screenshots and compare to requirements
6. **Functional Testing**: Test all user flows work correctly
7. **Cross-Platform Check**: Verify on web and mobile if possible

### Quality Gates - Definition of Done
A feature is only complete when:
- [ ] Functionality works as specified
- [ ] Visual design matches requirements/mockups
- [ ] No console errors in browser
- [ ] Styles actually render (not just compile)
- [ ] Navigation flows work correctly
- [ ] Data persistence functions properly
- [ ] Screenshots verify visual quality
- [ ] Code follows project patterns

### Commands Reference
- `npm run web` - Start Expo web development
- `npm start` - Start Expo with QR code for mobile
- `npx expo start --clear` - Clear cache and restart
- `npm run android` - Android development
- `npm run ios` - iOS development

### Environment Setup
- **Expo CLI**: Use for development and building
- **AsyncStorage**: For local data persistence
- **React Navigation**: For app navigation
- **StyleSheet vs nativewind**: Choose one approach consistently

### Troubleshooting
- **Styling Issues**: Check if classes/styles actually apply in browser
- **Metro Issues**: Clear cache with `--clear` flag
- **Import Errors**: Verify file paths and extensions
- **Navigation Issues**: Check navigator setup and route params
- **AsyncStorage**: Use debugging to verify data persistence

## Specific App Guidelines

### Design System
- **Colors**: iOS-style colors (primary: #007AFF, success: #34C759, warning: #FF9500)
- **Typography**: Apple system fonts with proper hierarchy
- **Spacing**: 8pt grid system (8, 16, 24, 32px)
- **Shadows**: Subtle shadows for cards and buttons
- **Border Radius**: 12px for buttons, 16px for cards

### Key Features
- **Time Tracking**: Start/stop sessions with live timer
- **Payment Requests**: Request and mark payments as paid
- **Activity Feed**: Real-time updates between service provider and client
- **Client Management**: Add clients with hourly rates
- **History**: View past sessions and payment status

### Data Flow
- **AsyncStorage**: All data persisted locally
- **Real-time Updates**: Activity feed updates when actions occur
- **State Management**: React hooks for component state
- **Navigation**: React Navigation with tabs and stack

### Testing Checklist
- [ ] Session tracking works (start/stop/timer)
- [ ] Payment flow works (request/mark paid)
- [ ] Client management works (add/view clients)
- [ ] Activity feed updates properly
- [ ] Navigation between screens works
- [ ] Data persists between app restarts
- [ ] Visual design matches mockups
- [ ] No console errors
- [ ] App loads without crashes

### Common Pitfalls
- **Styling Not Rendering**: Verify approach (nativewind vs StyleSheet) works
- **Missing Dependencies**: Install required packages for chosen approach
- **Cache Issues**: Clear Metro cache when making major changes
- **Platform Differences**: Test behavior on both web and mobile
- **AsyncStorage**: Handle async operations properly with try/catch

## Emergency Recovery
If the app is broken or styles aren't working:
1. Check console for errors
2. Clear Metro cache: `npx expo start --clear`
3. Verify all dependencies are installed
4. Check if styling approach is consistent
5. Compare working version with current code
6. Test with minimal example first

Remember: **Ship working, beautiful features. Test everything. Be honest about current state.**