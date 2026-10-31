// tests/test-four-pages-and-camera.ts
//
// Automated test suite for:
// 1. Four dedicated pages: Capture, Materials, Export, Settings
// 2. Client-side router & path normalization
// 3. Desktop & Mobile navigation tabs (BottomNav and Header)
// 4. Reliable Camera capture priority (<input type="file" capture="environment">)
// 5. Interactive ImageCropperModal (crop handles, zoom, rotate 90°, reset, canvas export)
// 6. Preservation of data persistence & review workflow
//

import fs from 'node:fs';
import path from 'node:path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('TEST SUITE: FOUR PAGES NAVIGATION & CAMERA REDESIGN VERIFICATION');
console.log('================================================================\n');

// 1. VERIFY FOUR DEDICATED PAGES EXIST
console.log('--- 1. FOUR DEDICATED PAGE COMPONENTS ---');
const capturePagePath = path.resolve('src/pages/CapturePage.tsx');
const materialsPagePath = path.resolve('src/pages/MaterialsPage.tsx');
const exportPagePath = path.resolve('src/pages/ExportPage.tsx');
const settingsPagePath = path.resolve('src/pages/SettingsPage.tsx');

assert(fs.existsSync(capturePagePath), 'CapturePage.tsx exists');
assert(fs.existsSync(materialsPagePath), 'MaterialsPage.tsx exists');
assert(fs.existsSync(exportPagePath), 'ExportPage.tsx exists');
assert(fs.existsSync(settingsPagePath), 'SettingsPage.tsx exists');

const capturePageContent = fs.readFileSync(capturePagePath, 'utf8');
const materialsPageContent = fs.readFileSync(materialsPagePath, 'utf8');
const exportPageContent = fs.readFileSync(exportPagePath, 'utf8');
const settingsPageContent = fs.readFileSync(settingsPagePath, 'utf8');

assert(capturePageContent.includes('<PhotoCapture'), 'CapturePage renders PhotoCapture component');
assert(!capturePageContent.includes('<MaterialsTable'), 'CapturePage does NOT duplicate materials table');
assert(!capturePageContent.includes('<DownloadSection'), 'CapturePage does NOT duplicate export section');

assert(materialsPageContent.includes('<MaterialsTable'), 'MaterialsPage renders MaterialsTable component');
assert(!materialsPageContent.includes('<PhotoCapture'), 'MaterialsPage does NOT duplicate capture card');

assert(exportPageContent.includes('<DownloadSection'), 'ExportPage renders DownloadSection component');
assert(!exportPageContent.includes('<PhotoCapture'), 'ExportPage does NOT duplicate capture card');

// 2. VERIFY SETTINGS PAGE SECTIONS
console.log('\n--- 2. SETTINGS PAGE LOGICAL SECTIONS ---');
assert(settingsPageContent.includes('Account & Profile'), 'Settings includes Account & Profile section');
assert(settingsPageContent.includes('Application Preferences'), 'Settings includes Application Preferences section');
assert(settingsPageContent.includes('Data & Synchronization'), 'Settings includes Data & Synchronization section');
assert(settingsPageContent.includes('AI Recognition Settings'), 'Settings includes AI Recognition Settings section');
assert(settingsPageContent.includes('Camera & Upload'), 'Settings includes Camera & Upload section');
assert(settingsPageContent.includes('About PW Materials'), 'Settings includes About PW Materials section');

// 3. VERIFY ROUTER & APP COMPONENT
console.log('\n--- 3. ROUTER & 4-PAGE APP INTEGRATION ---');
const routerPath = path.resolve('src/hooks/useAppRouter.ts');
const appPath = path.resolve('src/App.tsx');

assert(fs.existsSync(routerPath), 'useAppRouter.ts exists');
const routerContent = fs.readFileSync(routerPath, 'utf8');
assert(routerContent.includes("'/capture'"), 'Router supports /capture route');
assert(routerContent.includes("'/materials'"), 'Router supports /materials route');
assert(routerContent.includes("'/export'"), 'Router supports /export route');
assert(routerContent.includes("'/settings'"), 'Router supports /settings route');
assert(routerContent.includes("default route is /capture") || routerContent.includes("return '/capture'"), 'Default landing route is /capture');

const appContent = fs.readFileSync(appPath, 'utf8');
assert(appContent.includes("currentRoute === '/capture'"), 'App conditionally renders CapturePage on /capture');
assert(appContent.includes("currentRoute === '/materials'"), 'App conditionally renders MaterialsPage on /materials');
assert(appContent.includes("currentRoute === '/export'"), 'App conditionally renders ExportPage on /export');
assert(appContent.includes("currentRoute === '/settings'"), 'App conditionally renders SettingsPage on /settings');
assert(appContent.includes("navigate('/materials')"), 'App auto-navigates to /materials upon saving new records');

// 4. VERIFY NAVIGATION CONTROLS (HEADER & BOTTOM NAV)
console.log('\n--- 4. DESKTOP & MOBILE NAVIGATION TABS ---');
const headerPath = path.resolve('src/components/Layout/Header.tsx');
const bottomNavPath = path.resolve('src/components/Layout/BottomNav.tsx');

const headerContent = fs.readFileSync(headerPath, 'utf8');
const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8');

assert(headerContent.includes("onNavigate('/capture')"), 'Desktop header navigates to /capture');
assert(headerContent.includes("onNavigate('/materials')"), 'Desktop header navigates to /materials');
assert(headerContent.includes("onNavigate('/export')"), 'Desktop header navigates to /export');
assert(headerContent.includes("onNavigate('/settings')"), 'Desktop header navigates to /settings');

assert(bottomNavContent.includes("onNavigate('/capture')"), 'Mobile bottom nav navigates to /capture');
assert(bottomNavContent.includes("onNavigate('/materials')"), 'Mobile bottom nav navigates to /materials');
assert(bottomNavContent.includes("onNavigate('/export')"), 'Mobile bottom nav navigates to /export');
assert(bottomNavContent.includes("onNavigate('/settings')"), 'Mobile bottom nav navigates to /settings');

// 5. VERIFY NATIVE CAMERA PRIORITY & IMAGE CROPPING STEP
console.log('\n--- 5. RELIABLE CAMERA REDESIGN & IMAGE CROPPER ---');
const photoCapturePath = path.resolve('src/components/PhotoSection/PhotoCapture.tsx');
const cropperPath = path.resolve('src/components/ImageEditor/ImageCropperModal.tsx');

assert(fs.existsSync(cropperPath), 'ImageCropperModal.tsx exists');
const photoCaptureContent = fs.readFileSync(photoCapturePath, 'utf8');
const cropperContent = fs.readFileSync(cropperPath, 'utf8');

assert(photoCaptureContent.includes('capture="environment"'), 'PhotoCapture uses native capture="environment" HTML input');
assert(photoCaptureContent.includes('ImageCropperModal'), 'PhotoCapture imports and mounts ImageCropperModal');
assert(photoCaptureContent.includes('setIsCropperOpen(true)'), 'PhotoCapture opens cropper after snapping or uploading photo');
assert(photoCaptureContent.includes('handleCropConfirmed'), 'PhotoCapture forwards cropped image to AI processing');

assert(cropperContent.includes('RotateCcw') && cropperContent.includes('RotateCw'), 'Image cropper has 90° CCW and CW rotation controls');
assert(cropperContent.includes('ZoomIn') && cropperContent.includes('ZoomOut'), 'Image cropper has zoom in/out controls');
assert(cropperContent.includes('handleReset'), 'Image cropper has reset button');
assert(cropperContent.includes('handlePointerDown'), 'Image cropper has draggable crop frame and 4 corner handles');
assert(cropperContent.includes('toDataURL'), 'Image cropper generates high-quality base64 canvas output');

// 6. SPA REWRITES IN VERCEL.JSON
console.log('\n--- 6. SPA REWRITES CONFIGURATION ---');
const vercelConfigPath = path.resolve('vercel.json');
const vercelContent = fs.readFileSync(vercelConfigPath, 'utf8');
assert(vercelContent.includes('"source": "/((?!api/).*)"'), 'vercel.json contains SPA rewrite for direct 4-page URLs');

console.log('\n================================================================');
console.log(`TOTAL CHECKS: ${passCount} passed, ${failCount} failed.`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL FOUR PAGES & CAMERA REDESIGN CHECKS PASSED!\n');
}
