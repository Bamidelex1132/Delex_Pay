// debug.js
alert("✅ Debug script is running");
console.log("✅ Debug script loaded");

// Catch any JavaScript errors
window.onerror = function (message, source, lineno, colno, error) {
    alert("🔥 JS Error:\n" + message + "\n(" + source + ":" + lineno + ")");
    console.error("🔥 JS Error:", message, "at", source + ":" + lineno, "col", colno, error);
};

// Catch unhandled Promise rejections
window.addEventListener("unhandledrejection", function (event) {
    alert("❌ Promise Error:\n" + event.reason);
    console.error("❌ Promise Error:", event.reason);
});
