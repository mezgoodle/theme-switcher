const vscode = require("vscode");

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
  console.log("Theme Switcher activated!");

  const config = vscode.workspace.getConfiguration("themeSwitcher");

  async function getTheme(type) {
    const availableThemes = vscode.extensions.all
      .flatMap((extension) => extension.packageJSON.contributes?.themes || [])
      .map((theme) => theme.label || theme.id);

    return await vscode.window.showQuickPick(availableThemes, {
      placeHolder: `Select ${type} theme`,
    });
  }

  async function getHour(type) {
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
    if (themeName) {
      vscode.workspace
        .getConfiguration("workbench")
        .update("colorTheme", themeName, vscode.ConfigurationTarget.Global);
    }
  }

  async function checkTimeAndSwitchTheme() {
    const lightThemeSetting = config.get("lightTheme");
    const darkThemeSetting = config.get("darkTheme");
    const startTimeSetting = config.get("startTime");
    const endTimeSetting = config.get("endTime");

    if (
      lightThemeSetting &&
      darkThemeSetting &&
      startTimeSetting !== undefined &&
      endTimeSetting !== undefined
    ) {
      const now = new Date();
      const hour = now.getHours();

      if (hour >= startTimeSetting && hour < endTimeSetting) {
        setTheme(lightThemeSetting);
      } else {
        setTheme(darkThemeSetting);
      }
    } else {
      await promptForSettings();
      // Викликаємо рекурсивно, щоб перевірити час та встановити тему після отримання налаштувань
      await checkTimeAndSwitchTheme();
    }
  }

  await checkTimeAndSwitchTheme(); // Чекаємо завершення першої перевірки
  setInterval(checkTimeAndSwitchTheme, 60000);

  let disposable = vscode.commands.registerCommand(
    "theme-switcher.switchTheme",
    checkTimeAndSwitchTheme
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
