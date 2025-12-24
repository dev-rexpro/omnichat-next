
importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.2/full/pyodide.js");

let stdOutAndErr = [];

let pyodideReadyPromise = loadPyodide({
    stdout: (data) => stdOutAndErr.push(data),
    stderr: (data) => stdOutAndErr.push(data),
});

let alreadySetBuff = false;

self.onmessage = async (event) => {
    stdOutAndErr = [];

    // make sure loading is done
    const pyodide = await pyodideReadyPromise;
    const { id, python, context, interruptBuffer } = event.data;

    if (interruptBuffer && !alreadySetBuff) {
        pyodide.setInterruptBuffer(interruptBuffer);
        alreadySetBuff = true;
    }

    // Now load any packages we need, run the code, and send the result back.
    await pyodide.loadPackagesFromImports(python);

    // make a Python dictionary with the data from content
    const dict = pyodide.globals.get("dict");
    const globals = dict(Object.entries(context || {}));
    try {
        self.postMessage({ id, running: true });
        // Execute the python code in this context
        const result = pyodide.runPython(python, { globals });
        self.postMessage({ result: result ? result.toString() : "", id, stdOutAndErr });
    } catch (error) {
        self.postMessage({ error: error.message, id });
    }
    if (interruptBuffer) {
        interruptBuffer[0] = 0;
    }
};
