# AGENTS.md

Guidelines for AI coding assistants (e.g., GitHub Copilot, Claude Code) and human contributors.

---

## Google Translate / Browser Extension DOM Patch (REQUIRED)

Browser extensions like Google Translate inject `<font>` wrapper nodes into the DOM, which causes React's `removeChild` and `insertBefore` calls to fail with:

> "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node."

### a) Layout-level patches (root layout file)

**This fix is mandatory in every root layout file.** Three things are required:

1. **Inline `<script>` in `<head>`** that patches `Node.prototype.removeChild` and `Node.prototype.insertBefore` BEFORE React hydration:

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `(function(){if(typeof Node!=='undefined'&&Node.prototype&&!Node.prototype.__rcPatched){var origRC=Node.prototype.removeChild;Node.prototype.removeChild=function(child){if(child&&child.parentNode===this){return origRC.call(this,child)}return child};var origIB=Node.prototype.insertBefore;Node.prototype.insertBefore=function(newNode,refNode){if(refNode&&refNode.parentNode!==this){return origRC.call(this,newNode,null)}return origIB.call(this,newNode,refNode)};Node.prototype.__rcPatched=true}})();`,
    }}
  />
</head>
```

2. **`suppressHydrationWarning`** on `<html>` tag
3. **`suppressHydrationWarning`** on `<body>` tag

### b) `translate="no"` on shadcn/Radix portal components (REQUIRED)

Browser translation mutates the DOM inside React portals (overlays, dropdowns, dialogs, etc.), causing `removeChild` errors when Radix tries to unmount them. Adding `translate="no"` tells the browser not to translate those subtrees, **preventing the problem at the source**.

**Every shadcn/Radix portal-based component wrapper must have `translate="no"` on its Content, Trigger, and Item sub-components.** Target files in `src/components/ui/`:

- `select.tsx` — SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectValue, SelectLabel
- `dialog.tsx` — DialogTrigger, DialogClose, DialogOverlay, DialogContent
- `dropdown-menu.tsx` — DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, etc.
- `popover.tsx` — PopoverTrigger, PopoverContent
- `tooltip.tsx` — TooltipTrigger, TooltipContent
- `alert-dialog.tsx` — AlertDialogTrigger, AlertDialogOverlay, AlertDialogContent
- `sheet.tsx` — SheetTrigger, SheetClose, SheetOverlay, SheetContent
- `command.tsx` — Command, CommandInput, CommandGroup, CommandItem
- Any other portal-based components (context-menu, hover-card, menubar, navigation-menu)

**Pattern:**
```tsx
<SomePrimitive.Content translate="no" {...props} />
<SomePrimitive.Trigger translate="no" {...props} />
<SomePrimitive.Item translate="no" {...props} />
```

**Reference:** https://medium.com/@hridoycodev/fixing-the-removechild-dom-notfounderror-caused-by-browser-translation-in-radix-shadcn-ui-130690e42eb2

**DO NOT:**

- Only patch `document.body` — Google Translate wraps nodes throughout the entire DOM tree
- Use a `useEffect` as the only fix — it runs too late, after React hydration
- Remove this patch — it is harmless and prevents crashes for all users with browser translation enabled
- Add new shadcn portal components without `translate="no"` on Content/Trigger/Item

**For Pages Router** (`_document.tsx`): Add the inline script inside `<Head>` and `suppressHydrationWarning` on `<Html>` and `<body>`.
