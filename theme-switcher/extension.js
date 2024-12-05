const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate1(context) {
  console.log("Theme Switcher activated!");

  const config = vscode.workspace.getConfiguration("themeSwitcher");
  const firstRun = config.get("firstRun", true);

  if (firstRun) {
    console.log("First run, prompting for settings...");
    await promptForSettings();
    reloadWindow();
    await config.update("firstRun", false, vscode.ConfigurationTarget.Global);
  }

  async function getTheme(type) {
    console.log(`Prompting for ${type} theme...`);
    const availableThemes = vscode.extensions.all
      .flatMap((extension) => extension.packageJSON.contributes?.themes || [])
      .map((theme) => theme.label || theme.id);

    return await vscode.window.showQuickPick(availableThemes, {
      placeHolder: `Select ${type} theme`,
    });
  }

  function reloadWindow() {
    vscode.commands.executeCommand("workbench.action.reloadWindow");
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

    return input !== undefined ? parseInt(input) : undefined;
  }

  async function promptForSettings() {
    console.log("Prompting for settings...");
    const lightTheme = await getTheme("light");
    if (lightTheme) {
      await config.update(
        "lightTheme",
        lightTheme,
        vscode.ConfigurationTarget.Global
      );
    }

    const darkTheme = await getTheme("dark");
    if (darkTheme) {
      await config.update(
        "darkTheme",
        darkTheme,
        vscode.ConfigurationTarget.Global
      );
    }

    const startTime = await getHour("start");
    if (startTime !== undefined) {
      await config.update(
        "startTime",
        startTime,
        vscode.ConfigurationTarget.Global
      );
    }

    const endTime = await getHour("end");
    if (endTime !== undefined) {
      await config.update(
        "endTime",
        endTime,
        vscode.ConfigurationTarget.Global
      );
    }
  }

  function setTheme(themeName) {
    console.log(`Switching to theme: ${themeName}`);
    const availableThemes = vscode.extensions.all
      .flatMap((extension) => extension.packageJSON.contributes?.themes || [])
      .map((theme) => theme.label || theme.id);

    if (availableThemes.includes(themeName)) {
      vscode.workspace
        .getConfiguration("workbench")
        .update("colorTheme", themeName, vscode.ConfigurationTarget.Global)
        .then(
          () => {
            vscode.window.showInformationMessage(
              `Theme switched to ${themeName}`
            );
          },
          (error) => {
            vscode.window.showErrorMessage(`Failed to switch theme: ${error}`);
          }
        );
    } else {
      console.error(`Theme not found: ${themeName}`);
      vscode.window.showErrorMessage(`Theme not found: ${themeName}`);
    }
  }

  async function checkTimeAndSwitchTheme() {
    console.log("Checking time and switching theme...");
    const lightThemeSetting = config.get("lightTheme");
    const darkThemeSetting = config.get("darkTheme");
    const startTimeSetting = config.get("startTime");
    const endTimeSetting = config.get("endTime");

    if (
      lightThemeSetting === undefined ||
      darkThemeSetting === undefined ||
      startTimeSetting === undefined ||
      endTimeSetting === undefined
    ) {
      await promptForSettings();
      await checkTimeAndSwitchTheme();
    } else {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= startTimeSetting && hour < endTimeSetting) {
        setTheme(lightThemeSetting);
      } else {
        setTheme(darkThemeSetting);
      }
    }
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

  context.subscriptions.push(disposableSwitch, disposableForceCheck);
}

function deactivate() {
  console.log("Theme Switcher deactivated!");
}

module.exports = {
  activate,
  deactivate,
};

function activate(context) {
  const config = vscode.workspace.getConfiguration("themeSwitcher");
  let darkThemeSetting = config.get("darkTheme");
  if (darkThemeSetting === "") {
    darkThemeSetting = "Dark Modern";
  }
  // Перемикання теми
  vscode.workspace
    .getConfiguration("workbench")
    .update("colorTheme", darkThemeSetting, vscode.ConfigurationTarget.Global)
    .then(
      () => {
        vscode.window.showInformationMessage(
          `Тема перемикнута на ${darkThemeSetting}!`
        );
      },
      (error) => {
        vscode.window.showErrorMessage(`Не вдалося змінити тему: ${error}`);
      }
    );
}
