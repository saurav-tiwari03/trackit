import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

// Description List wrapper <dl>
export const DescriptionList = Node.create({
  name: 'descriptionList',
  group: 'block',
  content: '(descriptionTerm descriptionDetails)+',
  isolating: false,

  parseHTML() {
    return [{ tag: 'dl' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['dl', mergeAttributes(HTMLAttributes, { class: 'description-list my-4 space-y-2' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      // Escape to exit the description list
      Escape: ({ editor }) => {
        if (!editor.isActive('descriptionList')) return false;
        
        const { state } = editor;
        const { $from } = state.selection;
        
        // Find the description list node
        let dlDepth = $from.depth;
        while (dlDepth > 0 && $from.node(dlDepth).type.name !== 'descriptionList') {
          dlDepth--;
        }
        
        if (dlDepth > 0) {
          // Insert paragraph after and move cursor there
          return editor.chain()
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const afterDl = $from.after(dlDepth);
                const paragraph = state.schema.nodes.paragraph.create();
                tr.insert(afterDl, paragraph);
                tr.setSelection(TextSelection.create(tr.doc, afterDl + 1));
              }
              return true;
            })
            .run();
        }
        
        return false;
      },
    };
  },
});

// Description Term <dt>
export const DescriptionTerm = Node.create({
  name: 'descriptionTerm',
  group: 'descriptionListItem',
  content: 'inline*',
  defining: false,
  isolating: false,

  parseHTML() {
    return [{ tag: 'dt' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['dt', mergeAttributes(HTMLAttributes, { class: 'font-semibold text-foreground cursor-text' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive('descriptionTerm')) return false;
        
        // Move to the next description details (dd element)
        return editor.commands.command(({ tr, state, dispatch }) => {
          const { $from } = state.selection;
          const dtNode = $from.node($from.depth);
          
          if (dtNode.type.name !== 'descriptionTerm') return false;
          
          // Find the position after this dt (start of dd)
          const afterDt = $from.after($from.depth);
          
          if (dispatch) {
            const newSelection = TextSelection.create(tr.doc, afterDt + 1);
            tr.setSelection(newSelection);
          }
          return true;
        });
      },
      // Tab to move to description
      Tab: ({ editor }) => {
        if (!editor.isActive('descriptionTerm')) return false;
        
        return editor.commands.command(({ tr, state, dispatch }) => {
          const { $from } = state.selection;
          const afterDt = $from.after($from.depth);
          
          if (dispatch) {
            const newSelection = TextSelection.create(tr.doc, afterDt + 1);
            tr.setSelection(newSelection);
          }
          return true;
        });
      },
    };
  },
});

// Description Details <dd>
export const DescriptionDetails = Node.create({
  name: 'descriptionDetails',
  group: 'descriptionListItem',
  content: 'inline*',
  defining: false,
  isolating: false,

  parseHTML() {
    return [{ tag: 'dd' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['dd', mergeAttributes(HTMLAttributes, { class: 'ml-4 text-muted-foreground cursor-text' }), 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        if (!editor.isActive('descriptionDetails')) return false;

        const { state } = editor;
        const { $from } = state.selection;
        
        // Check if the current dd is empty
        const currentNode = $from.parent;
        if (currentNode.textContent === '') {
          // Exit the description list by inserting a paragraph after
          // Find the description list node
          let dlDepth = $from.depth;
          while (dlDepth > 0 && $from.node(dlDepth).type.name !== 'descriptionList') {
            dlDepth--;
          }
          
          if (dlDepth > 0) {
            return editor.chain()
              .command(({ tr, dispatch }) => {
                if (dispatch) {
                  const afterDl = $from.after(dlDepth);
                  const paragraph = state.schema.nodes.paragraph.create();
                  tr.insert(afterDl, paragraph);
                  tr.setSelection(TextSelection.create(tr.doc, afterDl + 1));
                }
                return true;
              })
              .run();
          }
        }

        // Add a new dt/dd pair
        return editor.chain()
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              // Find the position after the current dd
              const afterDd = $from.after($from.depth);
              const dtNode = state.schema.nodes.descriptionTerm.create();
              const ddNode = state.schema.nodes.descriptionDetails.create();
              tr.insert(afterDd, [dtNode, ddNode]);
              // Position cursor inside the new dt
              tr.setSelection(TextSelection.create(tr.doc, afterDd + 1));
            }
            return true;
          })
          .run();
      },
      // Shift+Tab to go back to term
      'Shift-Tab': ({ editor }) => {
        if (!editor.isActive('descriptionDetails')) return false;
        
        return editor.commands.command(({ tr, state, dispatch }) => {
          const { $from } = state.selection;
          const beforeDd = $from.before($from.depth);
          
          if (dispatch) {
            // Go to the dt before this dd
            const newSelection = TextSelection.create(tr.doc, beforeDd - 1);
            tr.setSelection(newSelection);
          }
          return true;
        });
      },
      Backspace: ({ editor }) => {
        if (!editor.isActive('descriptionTerm') && !editor.isActive('descriptionDetails')) {
          return false;
        }

        const { state } = editor;
        const { $from } = state.selection;
        const currentNode = $from.parent;

        // If at start of empty term/details, try to delete the pair or exit
        if ($from.parentOffset === 0 && currentNode.textContent === '') {
          // Find the description list
          let dlDepth = $from.depth;
          while (dlDepth > 0 && $from.node(dlDepth).type.name !== 'descriptionList') {
            dlDepth--;
          }
          
          if (dlDepth > 0) {
            const dl = $from.node(dlDepth);
            if (dl.childCount <= 2) {
              // Last pair, remove the entire list
              return editor.commands.deleteNode('descriptionList');
            }
          }
        }

        return false;
      },
    };
  },
});

// Combined extension for easy import
export const DescriptionListKit = [DescriptionList, DescriptionTerm, DescriptionDetails];
