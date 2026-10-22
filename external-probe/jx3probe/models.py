from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class Unit:
    unit_id: int
    name: str
    kind: str
    x: int
    y: int
    z: int
    ptr: int
    distance: Optional[float] = None


@dataclass(frozen=True)
class Loot:
    object_id: int
    name: str
    x: int
    y: int
    z: int
    ptr: int
    distance: Optional[float] = None


@dataclass(frozen=True)
class Buff:
    index: int
    end_tick: int
    caster_id: int
    lazy_handle: int
    # 文檔缺少惰性句柄的解析結構；不得把此值冒充 buffID。
    buff_id: Optional[int] = None
    stacks: Optional[int] = None


@dataclass
class Snapshot:
    units: list[Unit] = field(default_factory=list)
    loot: list[Loot] = field(default_factory=list)
    self_buffs: list[Buff] = field(default_factory=list)
    inspect_buffs: list[Buff] = field(default_factory=list)
    self_id: Optional[int] = None
    inspect_id: Optional[int] = None
    game_target_id: Optional[int] = None
    errors: list[str] = field(default_factory=list)
    note: str = ""