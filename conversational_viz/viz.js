looker.plugins.visualizations.add({
  // Id and Label are legacy properties, but still required.
  id: "conversational-analytics-viz",
  label: "Conversational Analytics",

  // Set up the initial state of the visualization
  create: function(element, config) {
    // Insert a <style> tag with some styles we'll use later.
    element.innerHTML = `
      <style>
        .hello-world-vis {
          /* Vertical centering */
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: center;
        }
      </style>
    `;

    // Create a container element to let us center the text.
    var container = element.appendChild(document.createElement("div"));
    container.className = "hello-world-vis";

    // Create an element to contain the text.
    this._textElement = container.appendChild(document.createElement("div"));
  },

  // Render in response to the data or settings changing
  updateAsync: function(data, element, config, queryResponse, details, done) {
    // Clear any errors from previous updates
    this.clearErrors();

    // Grab the first cell of the data
    var firstRow = data[0];
    var firstCell = firstRow[queryResponse.fields.dimensions[0].name];

    // Insert the data into the page.
    this._textElement.innerHTML = "Hello, " + firstCell.value + "!";

    // We are done rendering! Let Looker know.
    done();
  }
});
