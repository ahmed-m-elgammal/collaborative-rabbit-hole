# Contributing to Collaborative Rabbit Hole 🐰

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/ahmed-m-elgammal/collaborative-rabbit-hole.git
   cd collaborative-rabbit-hole
   ```

2. **Load Extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project directory

3. **Make Changes**
   - The extension uses vanilla JavaScript (no build step required)
   - Changes to most files will auto-reload in Chrome
   - Service worker changes require extension reload

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**Use the bug report template** which includes:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
- Console logs or screenshots

### Suggesting Features

We welcome feature suggestions! Please use the feature request template and include:
- Clear description of the feature
- Use case and motivation
- How it fits with existing functionality
- Any potential implementation ideas

### Submitting Pull Requests

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow Code Style**
   - Use ES6+ JavaScript features
   - Use meaningful variable and function names
   - Add comments for complex logic
   - Follow existing code patterns

3. **Test Your Changes**
   - Load the extension and test all affected functionality
   - Test in different scenarios (new journey, existing journey, etc.)
   - Check browser console for errors
   - Verify IndexedDB data integrity

4. **Commit Guidelines**
   - Write clear, descriptive commit messages
   - Use present tense ("Add feature" not "Added feature")
   - Reference issue numbers when applicable
   
   Examples:
   ```
   Add journey playback feature (#123)
   Fix dead end detection algorithm
   Update visualization color schemes
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Fill out the pull request template
   - Link related issues
   - Add screenshots for UI changes

## Code Organization

### File Structure
- `background.js` - Service worker, tab tracking, journey management
- `db.js` - IndexedDB operations
- `content.js` - Page metadata extraction
- `analyzer.js` - Journey analysis algorithms
- `popup/` - Extension popup UI
- `visualization/` - D3.js visualization dashboard
- `settings/` - Settings page

### Key Concepts
- **Journey**: A browsing session with connected tabs
- **Node**: A single page visit within a journey
- **Parent-Child**: Tab relationship tracking

## Testing

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] New journeys can be created
- [ ] Tabs are tracked correctly
- [ ] Notes can be added and saved
- [ ] Visualization renders properly
- [ ] Export/import functionality works
- [ ] Settings are persisted
- [ ] No console errors

### Debugging
- **Service Worker**: `chrome://serviceworker-internals/`
- **Popup**: Right-click icon → "Inspect popup"
- **IndexedDB**: DevTools → Application → IndexedDB → RabbitHoleDB
- **Content Scripts**: DevTools on any page

## Pull Request Review Process

1. **Automated Checks** (when CI is added)
   - Code linting
   - Format validation

2. **Maintainer Review**
   - Code quality and style
   - Feature completeness
   - Testing coverage
   - Documentation updates

3. **Feedback and Iteration**
   - Address review comments
   - Push updates to the same branch
   - Re-request review when ready

## Areas We Need Help

- 🎨 UI/UX improvements
- 📊 Advanced visualization features
- 🔍 Better semantic analysis
- 📱 Mobile companion app
- 🌐 Internationalization (i18n)
- 📚 Documentation and tutorials
- 🐛 Bug fixes

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other contributors

## Questions?

- Open a [Discussion](../../discussions) for general questions
- Use [Issues](../../issues) for bug reports and feature requests
- Check existing documentation first

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Happy Contributing! 🚀**

