looker.plugins.visualizations.add({
  // Id and Label are legacy properties, but still required.
  id: "conversational-analytics-viz",
  label: "Conversational Analytics",

  options: {
    gcpProjectId: {
      type: "string",
      label: "Google Cloud Project ID",
      placeholder: "your-gcp-project-id"
    },
    gcpRegion: {
      type: "string",
      label: "Google Cloud Region",
      placeholder: "us-central1"
    },
    accessToken: {
      type: "string",
      label: "Access Token",
      placeholder: "Paste your access token here"
    }
  },

  // Set up the initial state of the visualization
  create: function(element, config) {
    element.innerHTML = `
      <style>
        .conv-analytics-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 10px;
          font-family: sans-serif;
        }
        .conv-analytics-container h3 {
          margin: 0 0 10px 0;
        }
        .conv-analytics-container pre {
          flex-grow: 1;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          padding: 10px;
          overflow: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .error {
          color: red;
        }
      </style>
    `;

    var container = element.appendChild(document.createElement("div"));
    container.className = "conv-analytics-container";

    this._titleElement = container.appendChild(document.createElement("h3"));
    this._titleElement.innerHTML = "API Response";
    
    this._preElement = container.appendChild(document.createElement("pre"));
    this._preElement.id = "response-container";
  },

  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {
    // Clear any errors from previous updates
    this.clearErrors();
    const preElement = document.getElementById("response-container");
    preElement.innerHTML = "";

    // Check for valid configuration
    if (!config.gcpProjectId || !config.gcpRegion || !config.accessToken) {
      this.addError({
        title: "Configuration Missing",
        message: "Please provide GCP Project ID, Region, and an Access Token in the visualization settings."
      });
      return done();
    }

    // Check for data
    if (data.length === 0) {
      preElement.innerHTML = "No data returned from the Looker query.";
      return done();
    }

    // Get conversation text from the first row and first column
    const firstRow = data[0];
    const firstCell = firstRow[queryResponse.fields.dimensions[0].name];
    const conversationText = firstCell.value;

    preElement.innerHTML = "Analyzing conversation, please wait...";

    const apiUrl = `https://${config.gcpRegion}-aiplatform.googleapis.com/v1/projects/${config.gcpProjectId}/locations/${config.gcpRegion}/publishers/google/models/gemini-1.5-pro:streamGenerateContent`;

    const requestBody = {
      "contents": {
        "role": "USER",
        "parts": [{ "text": conversationText }]
      },
      "tools": [{
        "conversationAnalyticsTool": {}
      }]
    };

    // Make the API call
    fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    })
    .then(response => {
      if (!response.ok) {
        // Try to get error message from response body
        return response.text().then(text => {
          throw new Error(`API Error: ${response.status} ${response.statusText}. Response: ${text}`);
        });
      }
      return response.json();
    })
    .then(apiResponse => {
      // The response from a streaming endpoint is an array. We'll combine the text parts.
      const fullResponse = apiResponse.reduce((acc, curr) => {
          if (curr.candidates && curr.candidates[0].content.parts) {
              curr.candidates[0].content.parts.forEach(part => {
                  if (part.text) {
                      acc += part.text;
                  }
              });
          }
          return acc;
      }, "");

      // Try to parse the combined text as JSON
      try {
        const jsonResponse = JSON.parse(fullResponse);
        preElement.innerHTML = JSON.stringify(jsonResponse, null, 2);
      } catch (e) {
        this.addError({ title: "API Response Error", message: "The API response was not valid JSON." });
        preElement.innerHTML = `Could not parse API response as JSON. Raw response:

${fullResponse}`;
      }
    })
    .catch(error => {
      this.addError({ title: "API Call Failed", message: error.message });
      preElement.innerHTML = `Error calling API: ${error.message}`;
    })
    .finally(() => {
      // We are done rendering! Let Looker know.
      done();
    });
  }
});