import { AnimationSpec, LayoutTransform, ProfileConfig } from '../types';

type Patch =
  | { kind: 'layout'; key: string; id: string; before?: LayoutTransform; after?: LayoutTransform }
  | { kind: 'motion'; key: string; id: string; before?: AnimationSpec[]; after?: AnimationSpec[] }
  | {
      kind: 'pitch';
      id: string;
      before: { x: number; y: number };
      after: { x: number; y: number };
    };
type Command = Patch[];
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Property patches keep unrelated profile edits intact when a gesture is undone. */
export class EditorHistory {
  undoStack: Command[] = [];
  redoStack: Command[] = [];
  private grouping = false;
  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.grouping = false;
  }
  endGesture() {
    this.grouping = false;
  }
  capture(before: ProfileConfig, after: ProfileConfig, group = false) {
    const pitchRebuilt =
      before.pitchFormation !== after.pitchFormation ||
      before.pitchTechs.length !== after.pitchTechs.length ||
      before.pitchTechs.some(
        (node, index) =>
          node.id !== after.pitchTechs[index]?.id || node.role !== after.pitchTechs[index]?.role,
      );
    if (pitchRebuilt) {
      this.undoStack = this.undoStack
        .map((command) => command.filter((p) => p.kind !== 'pitch'))
        .filter((command) => command.length);
      this.redoStack = this.redoStack
        .map((command) => command.filter((p) => p.kind !== 'pitch'))
        .filter((command) => command.length);
      this.endGesture();
    }
    const patches: Patch[] = [];
    for (const [kind, field] of [
      ['layout', 'layoutOverrides'],
      ['motion', 'motionOverrides'],
    ] as const) {
      for (const key of new Set([
        ...Object.keys(before[field] ?? {}),
        ...Object.keys(after[field] ?? {}),
      ])) {
        for (const id of new Set([
          ...Object.keys(before[field]?.[key] ?? {}),
          ...Object.keys(after[field]?.[key] ?? {}),
        ])) {
          const a = before[field]?.[key]?.[id],
            b = after[field]?.[key]?.[id];
          if (!equal(a, b))
            patches.push({
              kind,
              key,
              id,
              before: structuredClone(a),
              after: structuredClone(b),
            } as Patch);
        }
      }
    }
    if (!pitchRebuilt)
      for (const node of after.pitchTechs) {
        const previous = before.pitchTechs.find((n) => n.id === node.id);
        if (previous && (previous.x !== node.x || previous.y !== node.y))
          patches.push({
            kind: 'pitch',
            id: node.id,
            before: { x: previous.x, y: previous.y },
            after: { x: node.x, y: node.y },
          });
      }
    if (!patches.length) return;
    const last = this.undoStack.at(-1);
    if (
      group &&
      this.grouping &&
      last &&
      patches.length === last.length &&
      patches.every(
        (p, i) =>
          p.kind === last[i].kind &&
          p.id === last[i].id &&
          ('key' in p ? p.key === (last[i] as typeof p).key : true),
      )
    ) {
      patches.forEach((p, i) => {
        last[i].after = p.after as never;
      });
    } else {
      this.undoStack.push(patches);
      if (this.undoStack.length > 100) this.undoStack.shift();
    }
    this.grouping = group;
    this.redoStack = [];
  }
  private apply(config: ProfileConfig, command: Command, direction: 'before' | 'after') {
    const next = { ...config };
    for (const patch of command) {
      const value = structuredClone(patch[direction]);
      if (patch.kind === 'pitch') {
        next.pitchTechs = next.pitchTechs.map((n) => (n.id === patch.id ? { ...n, ...value } : n));
      } else {
        const field = patch.kind === 'layout' ? 'layoutOverrides' : 'motionOverrides';
        const groups: Record<string, Record<string, LayoutTransform | AnimationSpec[]>> = {
          ...next[field],
        };
        const entries = { ...groups[patch.key] };
        if (value === undefined) delete entries[patch.id];
        else entries[patch.id] = value as never;
        if (Object.keys(entries).length) groups[patch.key] = entries as never;
        else delete groups[patch.key];
        Object.assign(next, { [field]: groups });
      }
    }
    return next;
  }
  undo(config: ProfileConfig) {
    this.endGesture();
    const command = this.undoStack.pop();
    if (!command) return config;
    this.redoStack.push(command);
    return this.apply(config, command, 'before');
  }
  redo(config: ProfileConfig) {
    this.endGesture();
    const command = this.redoStack.pop();
    if (!command) return config;
    this.undoStack.push(command);
    return this.apply(config, command, 'after');
  }
}
