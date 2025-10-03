# backend/tests/test_command_parser.py
import pytest
from backend.services.command_parser import parse_transcript

ROSTER = [
    "Tommy",   # Keeper
    "Leo",     # Winger
    "Winston", # Striker
    "Alex",    # Midfield
    "Kip",     # Defence
    "Tom",     # Midfield
    "Logan",   # Defence
]

def test_goal_winston():
    result = parse_transcript("Goal Winston", ROSTER)
    assert result["event_type"] == "goal"
    assert result["player"] == "Winston"

def test_save_tommy():
    result = parse_transcript("Great save Tommy", ROSTER)
    assert result["event_type"] == "save"
    assert result["player"] == "Tommy"

def test_tackle_kip_minute():
    result = parse_transcript("Tackle Kip minute 12", ROSTER)
    assert result["event_type"] == "tackle"
    assert result["player"] == "Kip"
    assert result["minute"] == 12

def test_shot_leo():
    result = parse_transcript("Leo takes a shot", ROSTER)
    assert result["event_type"] == "shot"
    assert result["player"] == "Leo"

def test_pass_alex():
    result = parse_transcript("Pass from Alex", ROSTER)
    assert result["event_type"] == "pass"
    assert result["player"] == "Alex"

def test_sub_logan():
    result = parse_transcript("Sub Logan out", ROSTER)
    assert result["event_type"] == "sub"
    assert result["player"] == "Logan"
