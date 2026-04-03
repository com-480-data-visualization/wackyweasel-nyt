#set page(
  width: 210mm,
  height: 297mm,
  margin: 0mm,
  fill: rgb("1a1a2e"),
)

#set text(
  font: "Courier New",
  fill: rgb("e0e0e0"),
)

#place(
  center + horizon,
  dy: 5mm,
  block(width: 185mm)[
    #align(center)[
      #image("../images/world-outline.svg", width: 100%)
    ]
  ],
)

#place(
  center + top,
  dy: 35mm,
  block(width: 160mm)[
    #align(center)[
      #text(size: 32pt, weight: "bold", fill: white)[
        2.2 Million Stories
      ]
      #v(8mm)
      #text(size: 12.5pt, fill: rgb("a8c6e0"))[
        How the New York Times connected countries across 25 years
      ]
    ]
  ],
)

#place(
  center + bottom,
  dy: -40mm,
  block(width: 160mm)[
    #align(center)[
      #text(size: 11pt, fill: rgb("8a8fa8"))[
        Process Book
      ]
      #v(4mm)
      #text(size: 13pt, fill: rgb("e0e0e0"))[
        COM-480 Data Visualization, EPFL
      ]
      #v(4mm)
      #text(size: 12pt, fill: rgb("8a8fa8"))[
        Florian Hitz
      ]
      #v(4mm)
      #text(size: 11pt, fill: rgb("6a7088"))[
        Spring 2026
      ]
    ]
  ],
)
