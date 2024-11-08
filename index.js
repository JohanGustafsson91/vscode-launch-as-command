const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function run() {
  try {
    const vsCodeLaunchFile = path.join(process.cwd(), ".vscode/launch.json");

    if (!fs.existsSync(vsCodeLaunchFile)) {
      throw new Error("path does not exists for vscode launch profiles");
    }

    const jsonContent = fs.readFileSync(vsCodeLaunchFile, "utf-8");
    const cleanedJsonContent = jsonContent.replace(/\/\/.*$/gm, "");
    const { configurations = [] } = JSON.parse(cleanedJsonContent);

    if (!configurations.length) {
      throw new Error("No configurations found");
    }

    const selectedConfigurationIndex = await promptUserForSelection(
      "Select a configuration",
      configurations,
      rl,
    );

    const launchConfig = configurations[selectedConfigurationIndex];

    if (!launchConfig.runtimeExecutable) {
      throw new Error("Missing 'runtimeExecutable' in selected configuration");
    }

    const devProcess = spawn(
      launchConfig.runtimeExecutable,
      launchConfig.runtimeArgs || [],
      {
        stdio: "inherit",
        shell: true,
        env: { ...process.env, ...launchConfig.env },
      },
    );

    devProcess.on("close", (code) => {
      console.log(`Child process exited with code ${code}`);
    });

    devProcess.on("error", (err) => {
      console.error(`Failed to start process: ${err.message}`);
    });
  } catch (err) {
    console.error("Error reading or parsing launch.json:", err);
  } finally {
    rl.close();
  }
}

run();

async function promptUserForSelection(question, options, rl) {
  return new Promise((resolve) => {
    const displayOptions = options
      .map((config, index) => `(${index + 1}) ${config?.name || "Unnamed"}`)
      .join("\n");
    console.log(displayOptions);

    const askQuestion = () => {
      rl.question(`\n${question}: `, (answer) => {
        const choice = parseInt(answer, 10);
        if (choice > 0 && choice <= options.length) {
          resolve(choice - 1);
        } else {
          console.log("Invalid choice. Please enter a valid number.");
          askQuestion();
        }
      });
    };

    askQuestion();
  });
}
