"""V5 contract code generator.

Reads schemas/*.json and produces:
  generated/typescript/index.ts  - Zod schemas + inferred types
  generated/python/__init__.py   - Pydantic v2 model stubs
"""
import json
import sys
from pathlib import Path

SCHEMAS_DIR = Path(__file__).parent / "schemas"
TS_OUT = Path(__file__).parent / "generated" / "typescript" / "index.ts"
PY_OUT = Path(__file__).parent / "generated" / "python" / "__init__.py"
CONSTRAINED_MODEL_TITLES = {"CostLatency", "EvidenceManifest", "PipelineEvent", "TraceContext"}


def _json_type_to_zod(js_type: str, enum: list[str] | None) -> str:
    if enum:
        vals = ", ".join(f'"{v}"' for v in enum)
        return f"z.enum([{vals}])"
    mapping = {
        "string": "z.string()",
        "integer": "z.number().int()",
        "number": "z.number()",
        "boolean": "z.boolean()",
        "array": "z.array(z.any())",
        "object": "z.record(z.any())",
    }
    return mapping.get(js_type, "z.any()")


def generate_zod(schema_path: Path) -> str:
    with open(schema_path) as f:
        schema = json.load(f)
    title = schema.get("title", schema_path.stem)
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    lines = [f"export const {title}Schema = z.object({{"]
    for name, prop in props.items():
        zod_type = _json_type_to_zod(prop.get("type", "string"), prop.get("enum"))
        opt = "" if name in required else ".optional()"
        default = ""
        if "default" in prop:
            default = f".default({json.dumps(prop['default'])})"
        lines.append(f"  {name}: {zod_type}{opt}{default},")
    lines.append("});")
    lines.append(f"export type {title} = z.infer<typeof {title}Schema>;")
    return "\n".join(lines)


def _pascal_case(value: str) -> str:
    return "".join(part.capitalize() for part in value.replace("-", "_").split("_"))


def _pydantic_type(prop: dict, nested_name: str) -> str:
    if enum := prop.get("enum"):
        return "Literal[" + ", ".join(repr(value) for value in enum) + "]"

    mapping = {
        "string": "str",
        "integer": "int",
        "number": "float",
        "boolean": "bool",
        "array": "list",
        "object": "dict",
    }
    js_type = prop.get("type", "string")
    py_type = mapping.get(js_type, "Any")
    if js_type == "array" and "items" in prop:
        py_type = f"list[{_pydantic_type(prop['items'], nested_name)}]"
    elif js_type == "object" and "properties" in prop:
        py_type = nested_name

    constraints = []
    if "minimum" in prop and js_type in {"integer", "number"}:
        constraints.append(f"ge={prop['minimum']}")
    if "pattern" in prop and js_type == "string":
        constraints.append(f"pattern={prop['pattern']!r}")
    if constraints:
        return f"Annotated[{py_type}, Field({', '.join(constraints)})]"
    return py_type


def generate_pydantic(schema_path: Path) -> str:
    with open(schema_path) as f:
        schema = json.load(f)
    title = schema.get("title", schema_path.stem)
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    if title not in CONSTRAINED_MODEL_TITLES:
        lines = [f"class {title}(BaseModel):"]
        if not props:
            lines.append("    pass")
        for name, prop in props.items():
            py_type = prop.get("type", "str")
            mapping = {
                "string": "str",
                "integer": "int",
                "number": "float",
                "boolean": "bool",
                "array": "list",
                "object": "dict",
            }
            py_type = mapping.get(py_type, "Any")
            if name not in required:
                if "default" in prop:
                    lines.append(f"    {name}: {py_type} = {json.dumps(prop['default'])}")
                else:
                    lines.append(f"    {name}: {py_type} | None = None")
            else:
                lines.append(f"    {name}: {py_type}")
        return "\n    ".join(lines)

    classes: list[str] = []

    def render_class(class_name: str, class_props: dict, class_required: set[str]) -> None:
        for name, prop in class_props.items():
            if prop.get("type") == "array" and prop.get("items", {}).get("properties"):
                render_class(
                    class_name + _pascal_case(name) + "Item",
                    prop["items"]["properties"],
                    set(prop["items"].get("required", [])),
                )
            elif prop.get("type") == "object" and prop.get("properties"):
                render_class(
                    class_name + _pascal_case(name),
                    prop["properties"],
                    set(prop.get("required", [])),
                )

        lines = [f"class {class_name}(BaseModel):"]
        if not class_props:
            lines.append("    pass")
        for name, prop in class_props.items():
            nested_name = class_name + _pascal_case(name)
            if prop.get("type") == "array":
                nested_name += "Item"
            py_type = _pydantic_type(prop, nested_name)
            if name not in class_required:
                if "default" in prop:
                    lines.append(f"    {name}: {py_type} = {json.dumps(prop['default'])}")
                else:
                    lines.append(f"    {name}: {py_type} | None = None")
            else:
                lines.append(f"    {name}: {py_type}")
        classes.append("\n".join(lines))

    render_class(title, props, required)
    return "\n\n".join(classes)


def main() -> None:
    ts_parts = [
        "// Auto-generated by packages/contracts/generate.py",
        "// DO NOT EDIT MANUALLY - regenerate with: pnpm --filter @wcp/contracts generate",
        'import { z } from "zod";',
        "",
    ]
    py_parts = [
        "# Auto-generated by packages/contracts/generate.py",
        "# DO NOT EDIT MANUALLY",
        "from pydantic import BaseModel, Field",
        "from typing import Annotated, Any, Literal",
        "",
    ]

    for schema_file in sorted(SCHEMAS_DIR.glob("*.json")):
        ts_parts.append(generate_zod(schema_file))
        ts_parts.append("")
        py_parts.append(generate_pydantic(schema_file))
        py_parts.append("")

    TS_OUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUT.write_text("\n".join(ts_parts))
    PY_OUT.parent.mkdir(parents=True, exist_ok=True)
    PY_OUT.write_text("\n".join(py_parts))
    print(f"Generated: {TS_OUT}, {PY_OUT}")


if __name__ == "__main__":
    main()
