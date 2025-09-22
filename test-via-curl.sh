#!/bin/bash

echo "🚀 Testing Provider ID fixes via curl injection..."

# Read the test script
TEST_SCRIPT=$(cat test-simple-validation.js)

# Create a complete HTML page that will run our test
cat > temp-test-page.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Provider ID Test</title>
    <script>
        // Wait for page load then run test
        window.addEventListener('load', async function() {
            console.log('🔧 Page loaded, starting test in 5 seconds...');
            setTimeout(async function() {
                try {
                    // Fetch the main app to get the JavaScript context
                    const response = await fetch('http://localhost:8087');
                    const html = await response.text();

                    // Create iframe with the app
                    const iframe = document.createElement('iframe');
                    iframe.src = 'http://localhost:8087';
                    iframe.style.width = '100%';
                    iframe.style.height = '600px';
                    document.body.appendChild(iframe);

                    // Wait for iframe to load
                    iframe.onload = function() {
                        console.log('📱 App loaded in iframe');

                        // Wait a bit more for app initialization
                        setTimeout(function() {
                            try {
                                // Try to access the iframe's content and run our test
                                const iframeWindow = iframe.contentWindow;
                                const iframeDoc = iframe.contentDocument;

                                if (iframeWindow && iframeDoc) {
                                    console.log('🎯 Injecting test script...');

                                    // Create script element in iframe
                                    const script = iframeDoc.createElement('script');
                                    script.textContent = \`${TEST_SCRIPT}\`;
                                    iframeDoc.head.appendChild(script);

                                    console.log('✅ Test script injected and should be running');
                                } else {
                                    console.error('❌ Cannot access iframe content (CORS)');
                                    console.log('🔄 Trying direct script injection...');

                                    // Fallback: eval the script in this window's context
                                    eval(\`${TEST_SCRIPT}\`);
                                }
                            } catch (error) {
                                console.error('❌ Script injection failed:', error);
                            }
                        }, 3000);
                    };

                } catch (error) {
                    console.error('❌ Test setup failed:', error);
                }
            }, 5000);
        });
    </script>
</head>
<body>
    <h1>Provider ID Test Runner</h1>
    <p>Check console for test results...</p>
    <div id="test-output"></div>
</body>
</html>
EOF

echo "📝 Created test page, starting simple HTTP server..."

# Start a simple HTTP server to serve our test page
python3 -m http.server 8088 &
SERVER_PID=$!

echo "🌐 Test page available at http://localhost:8088/temp-test-page.html"
echo "⏱️ Waiting 5 seconds for server to start..."
sleep 5

# Use curl to fetch the test page (this will trigger the JavaScript)
echo "🔄 Triggering test execution..."
curl -s "http://localhost:8088/temp-test-page.html" > /dev/null

echo "⏱️ Waiting 20 seconds for test completion..."
sleep 20

# Clean up
kill $SERVER_PID 2>/dev/null
rm -f temp-test-page.html

echo "✅ Test execution completed"