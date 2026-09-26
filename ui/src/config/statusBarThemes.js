/** Per-screen phone chrome: status bar + phone-screen background behind the bar. */

const APP_GRADIENT =
  'linear-gradient(165deg, rgba(96, 165, 250, 0.1) 0%, rgba(5, 10, 18, 0.42) 38%, rgba(0, 0, 0, 0) 58%)'

const APP_BG = {
  background: '#050a12',
  backgroundColor: '#050a12',
  backgroundImage: APP_GRADIENT,
}

const APP_CHROME = {
  modeClass: 'app-mode',
  phoneStyle: APP_BG,
  statusBarBg: 'transparent',
  statusBarClass: 'theme-app',
}

export function getScreenChrome(screen) {
  if (!screen || screen === 'home' || screen === 'lock') return null

  switch (screen) {
    case 'camera':
      return {
        modeClass: 'camera-mode',
        phoneStyle: { background: 'transparent', backgroundImage: 'none' },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-camera',
      }
    case 'dispatch':
      return {
        ...APP_CHROME,
        modeClass: 'app-mode emergency-mode',
        statusBarClass: 'theme-app',
      }
    case 'news':
      return {
        modeClass: 'app-mode news-mode',
        phoneStyle: {
          background: '#000',
          backgroundColor: '#000',
          backgroundImage:
            'linear-gradient(165deg, rgba(229, 57, 53, 0.12) 0%, rgba(0, 0, 0, 0.45) 40%, rgba(0, 0, 0, 0) 58%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app theme-news',
      }
    case 'calculator':
      return {
        modeClass: 'app-mode calculator-mode',
        phoneStyle: {
          background: '#000',
          backgroundColor: '#000',
          backgroundImage:
            'linear-gradient(180deg, rgba(10, 37, 64, 0.55) 0%, rgba(5, 10, 16, 0.18) 22%, rgba(0, 0, 0, 0) 42%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app theme-calculator',
      }
    case 'notes':
      return {
        modeClass: 'app-mode notes-mode',
        phoneStyle: {
          background: '#0a0804',
          backgroundColor: '#0a0804',
          backgroundImage:
            'linear-gradient(165deg, rgba(255, 159, 10, 0.12) 0%, rgba(5, 10, 16, 0.4) 38%, rgba(0, 0, 0, 0) 58%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app',
      }
    case 'weather':
      return {
        modeClass: 'app-mode weather-mode',
        phoneStyle: {
          background: '#060b14',
          backgroundColor: '#060b14',
          backgroundImage:
            'linear-gradient(165deg, rgba(56, 189, 248, 0.2) 0%, rgba(30, 58, 138, 0.42) 36%, rgba(0, 0, 0, 0) 58%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app',
      }
    case 'loans':
    case 'loan-apply':
    case 'loan-detail':
      return {
        modeClass: 'app-mode loans-mode',
        phoneStyle: {
          background: '#06100c',
          backgroundColor: '#06100c',
          backgroundImage:
            'linear-gradient(165deg, rgba(52, 199, 89, 0.18) 0%, rgba(10, 40, 24, 0.42) 36%, rgba(0, 0, 0, 0) 58%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app',
      }
    case 'call':
      return {
        modeClass: 'app-mode call-mode',
        phoneStyle: {
          background: '#143528',
          backgroundColor: '#143528',
          backgroundImage:
            'radial-gradient(ellipse 120% 65% at 50% -12%, rgba(52, 199, 89, 0.28) 0%, transparent 55%), linear-gradient(180deg, #143528 0%, #0f1f2e 32%, #0a1420 68%, #050810 100%)',
        },
        statusBarBg: 'transparent',
        statusBarClass: 'theme-app',
      }
    default:
      return {
        ...APP_CHROME,
        modeClass: `app-mode ${screen}-mode`,
      }
  }
}

export function getPhoneScreenStyle(screen, wallpaperStyle) {
  const chrome = getScreenChrome(screen)
  if (!chrome) return wallpaperStyle
  if (chrome.phoneStyle) return chrome.phoneStyle
  return APP_BG
}
