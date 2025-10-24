import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TP } from '../styles/themeV2';
import { simpleT } from '../i18n/simple';
import { capture } from '../services/analytics';
import { E } from '../services/analytics/events';

export type HamburgerMenuOption = 'help' | 'contact' | 'share';

export interface HamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: HamburgerMenuOption) => void;
  userRole: 'provider' | 'client';
  currentScreen: string;
}

/**
 * HamburgerMenu - Bottom sheet action menu
 *
 * Provides access to Help, Contact, and Share screens
 * Emits analytics events for menu interactions
 */
export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  visible,
  onClose,
  onSelectOption,
  userRole,
  currentScreen,
}) => {
  const handleSelectOption = (option: HamburgerMenuOption) => {
    // Analytics: menu option selected
    capture(E.MENU_OPTION_SELECTED, {
      role: userRole,
      option,
    });

    onSelectOption(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Tap overlay to close */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom sheet */}
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{simpleT('hamburger.menu.title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={TP.color.ink} />
            </TouchableOpacity>
          </View>

          {/* Menu Options */}
          <View style={styles.menuOptions}>
            {/* Help */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectOption('help')}
              accessibilityLabel={simpleT('hamburger.menu.help')}
              accessibilityRole="button"
            >
              <View style={styles.menuIconContainer}>
                <Feather name="help-circle" size={24} color={TP.color.ink} />
              </View>
              <Text style={styles.menuText}>{simpleT('hamburger.menu.help')}</Text>
              <Feather name="chevron-right" size={20} color={TP.color.textSecondary} />
            </TouchableOpacity>

            {/* Contact */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectOption('contact')}
              accessibilityLabel={simpleT('hamburger.menu.contact')}
              accessibilityRole="button"
            >
              <View style={styles.menuIconContainer}>
                <Feather name="mail" size={24} color={TP.color.ink} />
              </View>
              <Text style={styles.menuText}>{simpleT('hamburger.menu.contact')}</Text>
              <Feather name="chevron-right" size={20} color={TP.color.textSecondary} />
            </TouchableOpacity>

            {/* Share */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleSelectOption('share')}
              accessibilityLabel={simpleT('hamburger.menu.share')}
              accessibilityRole="button"
            >
              <View style={styles.menuIconContainer}>
                <Feather name="share-2" size={24} color={TP.color.ink} />
              </View>
              <Text style={styles.menuText}>{simpleT('hamburger.menu.share')}</Text>
              <Feather name="chevron-right" size={20} color={TP.color.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            accessibilityLabel={simpleT('hamburger.menu.cancel')}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>{simpleT('hamburger.menu.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: TP.color.modalOverlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: TP.color.modalBg,
    borderTopLeftRadius: TP.radius.card,
    borderTopRightRadius: TP.radius.card,
    padding: TP.spacing.x20,
    paddingBottom: TP.spacing.x32,
    ...TP.shadow.card.ios,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: TP.spacing.x20,
  },
  title: {
    fontSize: TP.font.title,
    fontWeight: TP.weight.bold,
    color: TP.color.ink,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  menuOptions: {
    gap: TP.spacing.x8,
    marginBottom: TP.spacing.x16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: TP.spacing.x16,
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.button,
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  menuIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.ink,
  },
  cancelButton: {
    padding: TP.spacing.x16,
    alignItems: 'center',
    backgroundColor: TP.color.cardBg,
    borderRadius: TP.radius.button,
    borderWidth: 1,
    borderColor: TP.color.border,
  },
  cancelText: {
    fontSize: TP.font.body,
    fontWeight: TP.weight.semibold,
    color: TP.color.textSecondary,
  },
});
