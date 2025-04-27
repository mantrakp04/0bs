import fs from 'fs';
import path from 'path';

// Import all the agent workflows
import { agent } from './index';
import { workflow as planWorkflow } from './plan';
import { compiledWorkflow as supervisorWorkflow } from './supervisor';
import { workflow as fsWorkflow } from './workers/fs';
import { workflow as vectorstoreWorkflow } from './workers/vectorstore';

/**
 * Generates and saves a Mermaid PNG diagram for a given workflow
 */
async function saveWorkflowGraph(workflow: any, filename: string) {
  try {
    // Check if the workflow is a StateGraph or a CompiledGraph
    const drawableGraph = workflow.getGraph 
      ? workflow.getGraph() 
      : workflow.graph 
        ? workflow.graph 
        : workflow;
        
    console.log(`Generating graph for ${filename}...`);
    const image = await drawableGraph.drawMermaidPng();
    
    const outputPath = path.join(__dirname, filename);
    fs.writeFileSync(outputPath, Buffer.from(await image.arrayBuffer()));
    
    console.log(`Workflow graph saved to ${outputPath}`);
    return true;
  } catch (error: any) {
    console.error(`Error saving graph ${filename}:`, error.message);
    return false;
  }
}

async function main() {
  // Create output directory if it doesn't exist
  const outputDir = path.join(__dirname, 'graphs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }
  
  // List of workflows to try with their names
  const workflows = [
    { workflow: agent, name: 'graphs/main-agent.png' },
    { workflow: planWorkflow, name: 'graphs/plan-workflow.png' },
    { workflow: supervisorWorkflow, name: 'graphs/supervisor-workflow.png' },
    { workflow: fsWorkflow, name: 'graphs/fs-workflow.png' },
    { workflow: vectorstoreWorkflow, name: 'graphs/vectorstore-workflow.png' }
  ];
  
  // Generate and save graphs for each workflow
  try {
    let successCount = 0;
    
    for (const { workflow, name } of workflows) {
      const success = await saveWorkflowGraph(workflow, name);
      if (success) successCount++;
    }
    
    console.log(`${successCount}/${workflows.length} workflow graphs generated successfully!`);
  } catch (error: any) {
    console.error('Error in main function:', error.message);
  }
}

// Run the main function if this file is executed directly
if (import.meta && import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => console.error('Uncaught error:', error));
} else if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => console.error('Uncaught error:', error));
}

// Export the functions for potential use elsewhere
export { saveWorkflowGraph };
