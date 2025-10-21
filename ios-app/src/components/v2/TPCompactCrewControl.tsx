import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../../styles/themeV2';
import { useTranslation } from 'react-i18next';

export interface TPCompactCrewControlProps {
  crewSize: number;
  onCrewSizeChange: (newSize: number) => void;
  maxSize?: number;
}

/**
 * TPCompactCrewControl - Compact Crew Size Picker
 *
 * Replaces large crew card with inline +/- buttons
 *
 * Features:
 * - Inline +/- buttons
 * - Current count display
 * - Minimum 1 person
 * - Configurable max size
 * - i18n support (crew/person/people)
 *
 * @example
 * <TPCompactCrewControl crewSize={2} onCrewSizeChange={setCrewSize} />
 */
export const TPCompactCrewControl: React.FC<TPCompactCrewControlProps> = ({
  crewSize,
  onCrewSizeChange,
  maxSize = 10,
}) => {
  const { t } = useTranslation();

  const handleDecrement = () => {
    if (crewSize > 1) {
      onCrewSizeChange(crewSize - 1);
    }
  };

  const handleIncrement = () => {
    if (crewSize < maxSize) {
      onCrewSizeChange(crewSize + 1);
    }
  };

  const getPeopleText = () => {
    return crewSize === 1 ? t('common.person') : t('common.people');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('common.crew')}:</Text>

      <TouchableOpacity
        onPress={handleDecrement}
        disabled={crewSize <= 1}
        style={[styles.button, crewSize <= 1 && styles.buttonDisabled]}
      >
        <Feather
          name="minus"
          size={18}
          color={crewSize <= 1 ? TP.color.textTertiary : TP.color.ink}
        />
      </TouchableOpacity>

      <View style={styles.countContainer}>
        <Text style={styles.count}>{crewSize}</Text>
      </View>

      <TouchableOpacity
        onPress={handleIncrement}
        disabled={crewSize >= maxSize}
        style={[styles.button, crewSize >= maxSize && styles.buttonDisabled]}
      >
        <Feather
          name="plus"
          size={18}
          color={crewSize >= maxSize ? TP.color.textTertiary : TP.color.ink}
        />
      </TouchableOpacity>

      <Text style={styles.peopleText}>{getPeopleText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TP.spacing.x8,
  },
  label: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TP.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TP.color.cardBg,
  },
  buttonDisabled: {
    backgroundColor: TP.color.btn.disabledBg,
    borderColor: TP.color.btn.disabledBorder,
  },
  countContainer: {
    width: 40,
    alignItems: 'center',
  },
  count: {
    fontSize: 20,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  peopleText: {
    fontSize: TP.font.footnote,
    fontWeight: TP.weight.medium,
    color: TP.color.textSecondary,
  },
});
