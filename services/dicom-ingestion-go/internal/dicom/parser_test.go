package dicom

import (
	"os"
	"testing"
	"time"
)

func TestGeneratePseudoUID(t *testing.T) {
	os.Setenv("DICOM_ANON_SALT", "test-salt-123")
	defer os.Unsetenv("DICOM_ANON_SALT")

	uid1 := GeneratePseudoUID("1.2.3.4.5", "tenant-a")
	uid2 := GeneratePseudoUID("1.2.3.4.5", "tenant-a")
	uid3 := GeneratePseudoUID("1.2.3.4.5", "tenant-b")

	if uid1 != uid2 {
		t.Errorf("deterministic UID failed: %s != %s", uid1, uid2)
	}
	if uid1 == uid3 {
		t.Errorf("different tenants produced same UID: %s", uid1)
	}
	if len(uid1) < 10 || uid1[:5] != "2.25." {
		t.Errorf("invalid UID format: %s", uid1)
	}
}

func TestGeneratePseudoUIDPanicsWithoutSalt(t *testing.T) {
	os.Unsetenv("DICOM_ANON_SALT")
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic without DICOM_ANON_SALT")
		}
	}()
	GeneratePseudoUID("1.2.3", "t")
}

func TestYearOnly(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"20240101", "2024"},
		{"19951225", "1995"},
		{"20", time.Now().Format("2006")},
	}
	for _, tt := range tests {
		result := yearOnly(tt.input)
		if result[:4] != tt.expected {
			t.Errorf("yearOnly(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestNumerify(t *testing.T) {
	result := numerify("abc123")
	if len(result) < 3 {
		t.Errorf("numerify too short: %s", result)
	}
	for _, c := range result {
		if c < '0' || c > '9' {
			t.Errorf("non-digit in numerify output: %c", c)
		}
	}
}
