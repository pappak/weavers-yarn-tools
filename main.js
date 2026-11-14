const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

let win = null;

function createWindow() {
    win = new BrowserWindow({
        width: 1080,
        height: 780,
        minWidth: 760,
        minHeight: 600,
        title: 'Weavers Yarn Tools',
        backgroundColor: '#f5f7fa',
        icon: path.join(__dirname, 'build', 'icon.png'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false
        }
    });

    // Minimal menu: keep copy/paste/quit, drop developer noise in production
    const isDev = !!process.env.WYT_DEV;
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        ...(isDev ? [{
            label: 'View',
            submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }]
        }] : []),
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
                { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Weavers Yarn Tools',
                    click: () => shell.openExternal('https://github.com/pappak/weavers-yarn-tools')
                }
            ]
        }
    ]));

    win.loadFile(path.join(__dirname, 'app', 'index.html'));

    // Allow child windows (the yarn calculator's print preview) as real
    // BrowserWindows; external http(s) links still go to the system browser.
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (!/^https?:/i.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true } };
        shell.openExternal(url);
        return { action: 'deny' };
    });

    win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
