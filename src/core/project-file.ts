import { Score, cloneScore } from "./document-model";

const PROJECT_VERSION = "1.0";
const FILE_EXTENSION = ".osmproj";

export interface ProjectFile {
  format: string;
  version: string;
  score: Score;
}

export function serializeProject(score: Score): string {
  const project: ProjectFile = {
    format: "OpenSheetMusic",
    version: PROJECT_VERSION,
    score: cloneScore(score),
  };
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Score {
  const parsed = JSON.parse(json);
  if (!parsed || parsed.format !== "OpenSheetMusic") {
    throw new Error("Invalid project file format");
  }
  return parsed.score as Score;
}

export function getFileExtension(): string {
  return FILE_EXTENSION;
}
