import {Graph} from 'graphlib'
import dot from 'graphlib-dot'
import fs from 'fs'

import dataset from './dataset'

const moments = dataset.jsonGraph.videos[80988062].interactiveVideoMoments.value
const {choicePoints} = moments.choicePointNavigatorMetadata.choicePointsMetadata

const segments = moments.momentsBySegment
const groups = moments.segmentGroups

const g = new Graph()

// Object.values(segments).forEach(segmentList => {
//   const sceneSegment = segmentList.find(x => x.type === 'scene:cs_bs')

//   if (sceneSegment) {
//     sceneSegment.choices.forEach(choice => {
//       if (!g.hasNode(choice.id)) {
//         g.setNode(choice.id, {label: choice.text})

//         console.log(choice.id, '=', choice.text)
//       }
//     })
//   }
// })

function constructGraph() {
  for (let choiceID in choicePoints) {
    const choicePoint = choicePoints[choiceID]
    const {choices, description} = choicePoint

    // console.log(choiceID, description, '->', choices.join(' '))

    if (!g.hasNode(choiceID)) {
      g.setNode(choiceID, {label: description})
    } else {
      console.warn('Collision A =', choiceID)
    }

    // if (choiceID === '5VA') console.log(choicePoint)

    choices.forEach(nextChoiceID => {
      if (nextChoiceID in segments) {
        const segmentList = segments[nextChoiceID]
        const sceneSegment = segmentList.find(x => x.type === 'scene:cs_bs')

        // console.log(sceneSegment)

        if (sceneSegment && sceneSegment.choices) {
          sceneSegment.choices.forEach(choice => {
            // if (choice.text.includes("Who's There?")) {
            //   console.log(choice.id, '--> WhosThere')
            // }

            if (!g.hasNode(choice.id)) {
              g.setNode(choice.id, {label: choice.text})
            } else {
              const node = g.node(choice.id)

              if (choice.text !== node.label) {
                console.warn(
                  'Collision B =',
                  choice.id,
                  '-',
                  choice.text,
                  '!=',
                  node.label
                )

                g.setNode(choice.id, {label: choice.text})
              }
            }

            // choices = [{id, segmentId, text}]

            console.log(description, '->', choice.text)

            g.setEdge(choiceID, choice.id)

            // if (choice.segmentId) {
            // g.setEdge(choiceID, choice.segmentId)
            // }
          })

          // console.log(choiceID, '->', sceneSegment.choices)

          // console.log(
          //   description,
          //   '->',
          //   sceneSegment.choices.map(x => x.text).join(' | ')
          // )
        }
      }

      // if (nextChoiceID in choicePoints) {
      //   const nextChoice = choicePoints[nextChoiceID]
      //   const nextDescription = nextChoice.description

      //   console.log(description, '-->', nextDescription)

      //   if (!g.hasNode(nextChoiceID)) {
      //     g.setNode(nextChoiceID, {label: nextDescription})
      //   }

      //   g.setEdge(choiceID, nextChoiceID)
      // }
    })
  }
}

function removeDisconnectedNodes() {
  const nodes = g.nodes()

  nodes.forEach(node => {
    const edges = g.nodeEdges(node)

    if (edges.length === 0) {
      g.removeNode(node)
    }
  })
}

function reconstructChoiceFromHistory() {
  const timeSegment = Object.values(segments)
    .map(segmentList => {
      const segment = segmentList.find(x => x.type === 'scene:cs_bs')

      if (segment) {
        const choicePoint = choicePoints[segment.id]

        return {
          id: segment.id,
          begin: segment.startMs / 1000 / 60,
          end: segment.endMs / 1000 / 60,
          text: choicePoint ? choicePoint.description : 'Untitled',
          choice: segment.choices.map(c => c.text).join(' or ')
        }
      }
    })
    .filter(x => x)
    .sort((a, b) => a.begin - b.begin)

  console.log('\nMy Choices:\n')

  console.log(
    timeSegment.map((x, i) => `${i}) ${x.text} => ${x.choice}`).join('\n')
  )

  let previousNode

  timeSegment.forEach(segment => {
    if (!g.hasNode(segment.text)) {
      g.setNode(segment.text)
    }

    if (previousNode) {
      g.setEdge(previousNode, segment.text)
    }

    previousNode = segment.text
  })
}

reconstructChoiceFromHistory()
// removeDisconnectedNodes()

const result = dot.write(g)

fs.writeFileSync('result.dot', result)

console.log('> Write Success')
