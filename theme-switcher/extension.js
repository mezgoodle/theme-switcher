const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  console.log("Theme Switcher activated!");

  const config = vscode.workspace.getConfiguration("themeSwitcher");
  let currentTheme = null;

  async function getTheme(type) {
    console.log(`Prompting for ${type} theme...`);
    const availableThemes = getAllThemes();

    return await vscode.window.showQuickPick(availableThemes, {
      placeHolder: `Select ${type} theme`,
    });
  }

  async function getHour(type) {
    console.log(`Prompting for ${type} hour...`);
    let input = await vscode.window.showInputBox({
      prompt: `Enter ${type} hour (0-23)`,
      validateInput: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0 || num > 23) {
          return "Please enter a number between 0 and 23";
        }
        return null;
      },
    });

    const parsedInput = input !== undefined ? parseInt(input) : undefined;
    return isNaN(parsedInput) ? undefined : parsedInput;
  }

  async function promptForSettings() {
    console.log("Prompting for settings...");

    const lightTheme = await getTheme("light");
    const darkTheme = await getTheme("dark");
    const startTime = await getHour("start");
    const endTime = await getHour("end");

    const updateConfig = async (key, value) => {
      const target = vscode.workspace.workspaceFolders
        ? vscode.ConfigurationTarget.Workspace
        : vscode.ConfigurationTarget.Global;
      await config.update(key, value, target);
    };

    if (lightTheme) {
      await updateConfig("lightTheme", lightTheme);
    }
    if (darkTheme) {
      await updateConfig("darkTheme", darkTheme);
    }
    if (startTime !== undefined) {
      await updateConfig("startTime", startTime);
    }
    if (endTime !== undefined) {
      await updateConfig("endTime", endTime);
    }

    await checkTimeAndSwitchTheme();
  }

  function getAllThemes() {
    return vscode.extensions.all
      .flatMap((extension) => extension.packageJSON.contributes?.themes || [])
      .map((theme) => theme.label || theme.id);
  }

  function getConfiguredThemes() {
    const lightTheme = config.get("lightTheme", "Light (Visual Studio)");
    const darkTheme = config.get("darkTheme", "Dark (Visual Studio)");
    const startTime = config.get("startTime", 8);
    const endTime = config.get("endTime", 20);
    const showNotifications = config.get("showNotifications", true);

    return { lightTheme, darkTheme, startTime, endTime, showNotifications };
  }

  async function setTheme(themeName, showNotifications) {
    console.log(`Switching to theme: ${themeName}`);
    const allThemes = getAllThemes();

    if (!allThemes.includes(themeName)) {
      console.error(`Theme not found: ${themeName}`);
      vscode.window.showErrorMessage(`Theme not found: ${themeName}`);
      return;
    }
    if (currentTheme === themeName) {
      return;
    }

    const tempTheme =
      currentTheme === "Light (Visual Studio)"
        ? "Dark (Visual Studio)"
        : "Light (Visual Studio)";
    currentTheme = themeName;

    await vscode.workspace
      .getConfiguration("workbench")
      .update("colorTheme", tempTheme, vscode.ConfigurationTarget.Global);
    await new Promise((resolve) => setTimeout(resolve, 50));
    await vscode.workspace
      .getConfiguration("workbench")
      .update("colorTheme", themeName, vscode.ConfigurationTarget.Global);

    if (showNotifications) {
      vscode.window.showInformationMessage(`Theme switched to ${themeName}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  }

  async function checkTimeAndSwitchTheme() {
    const { lightTheme, darkTheme, startTime, endTime, showNotifications } =
      getConfiguredThemes();
    const currentHour = new Date().getHours();
    const isDayTime = currentHour >= startTime && currentHour < endTime;
    const themeToSet = isDayTime ? lightTheme : darkTheme;

    console.log(
      `Checking time. Current hour: ${currentHour}, Light theme: ${lightTheme}, Dark theme: ${darkTheme}, Start: ${startTime}, End: ${endTime}, isDayTime: ${isDayTime}, Theme to set: ${themeToSet}`
    );

    await setTheme(themeToSet, showNotifications);
  }

  vscode.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("themeSwitcher")) {
      console.log("Configuration changed, rechecking themes...");
      await checkTimeAndSwitchTheme();
    }
  });

  await checkTimeAndSwitchTheme();
  setInterval(checkTimeAndSwitchTheme, 60000);

  let disposableSwitch = vscode.commands.registerCommand(
    "theme-switcher.switchTheme",
    async () => {
      console.log("Manually triggering theme check...");
      await checkTimeAndSwitchTheme();
    }
  );

  let disposableForceCheck = vscode.commands.registerCommand(
    "theme-switcher.forceCheck",
    async () => {
      console.log("Manually forcing theme change...");
      await checkTimeAndSwitchTheme();
    }
  );

  let disposableConfigure = vscode.commands.registerCommand(
    "theme-switcher.configure",
    async () => {
      console.log("Manually triggering configure prompt...");
      await promptForSettings();
    }
  );

  context.subscriptions.push(
    disposableSwitch,
    disposableForceCheck,
    disposableConfigure
  );
}

function deactivate() {
  console.log("Theme Switcher deactivated!");
}

module.exports = {
  activate,
  deactivate,
};
